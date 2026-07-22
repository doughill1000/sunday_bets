// src/routes/join/[code]/+page.server.ts
//
// Handles the invite-link redemption flow (ADR-0006 decisions 2 and 6).
//
// Load: validates the invite code and returns preview data (group name, expiry
// state) without consuming the invite. Signed-out visitors are sent to /auth
// with the invite path preserved so they return here after authenticating.
//
// Default action: calls the SECURITY DEFINER redeem_invite(code) RPC which
// atomically validates and consumes the invite, then adds the caller as a
// group member. On success, redirect to /picks (the hook resolves the new
// membership as the active group). Already-member is a no-op redirect.
// Error codes from the RPC are mapped to friendly messages.

import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { invalidateAuthContext } from '$lib/server/auth-context-cache';

// Maps RPC error codes to user-facing messages. P0002–P0006 match
// redeem_invite.sql; P0001 = not authenticated (should not reach the action
// without a session, but kept for defensive completeness).
function redeemErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'P0002':
      return 'This invite link is not valid. Double-check the URL or ask for a new one.';
    case 'P0003':
      return 'This invite has been revoked by the group commissioner.';
    case 'P0004':
      return 'This invite has expired. Ask your commissioner for a new one.';
    case 'P0005':
      return 'This invite has already been used the maximum number of times.';
    case 'P0006':
      return 'This group is full — ask the commissioner to remove a member or start another group.';
    default:
      return 'Could not join the group. Please try again.';
  }
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
  // Signed-out: preserve the full /join/[code] path through auth.
  if (!locals.user) {
    const next = url.pathname;
    throw redirect(303, `/auth?next=${encodeURIComponent(next)}`);
  }

  const { code } = params;

  // Pre-validate the code so we can show a friendly state before the user
  // clicks "Join". The invite SELECT policy is commissioner-only, so an invitee
  // cannot read their own invite directly — preview_invite is a SECURITY DEFINER
  // RPC that returns only the display state. redeem_invite re-validates
  // atomically on submit, so this is display-only.
  const { data, error } = await locals.supabase.rpc('preview_invite', { p_code: code });

  const preview = data as {
    status: string;
    group_name: string | null;
    starts_week_number?: number | null;
  } | null;

  if (error || !preview) {
    return { status: 'invalid' as const, groupName: null, code };
  }

  // Already a member: route straight in rather than showing the join button.
  if (preview.status === 'already_member') {
    throw redirect(303, '/picks');
  }

  if (preview.status === 'valid') {
    return {
      status: 'valid' as const,
      groupName: preview.group_name ?? null,
      // The week this invitee starts scoring from (ADR-0037); null in the offseason.
      startsWeekNumber: preview.starts_week_number ?? null,
      code
    };
  }

  // invalid | revoked | expired | exhausted — the page renders a friendly
  // message for each. Anything unexpected falls back to 'invalid'.
  const status = (['revoked', 'expired', 'exhausted'] as const).find((s) => s === preview.status);
  return { status: status ?? ('invalid' as const), groupName: null, code };
};

export const actions: Actions = {
  default: async ({ locals, params }) => {
    if (!locals.user) {
      return fail(401, { error: 'You must be signed in to join a group.' });
    }

    const { code } = params;

    const { error } = await locals.supabase.rpc('redeem_invite', { p_code: code });

    if (error) {
      // P0005 (exhausted) means the last slot was taken between our load check
      // and this submit — treat it the same as other terminal states.
      return fail(400, { error: redeemErrorMessage(error.code) });
    }

    // Bust this user's cached auth context (ADR-0014) so the redirect to /picks
    // sees the freshly-added membership instead of the cached pre-join (empty)
    // memberships, which would otherwise bounce the user back to /join.
    invalidateAuthContext(locals.user.id);

    // On success (including already-member no-op) the hook resolves the new
    // membership as the active group on the next request.
    throw redirect(303, '/picks');
  }
};

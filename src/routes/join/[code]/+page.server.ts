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

// Maps RPC error codes to user-facing messages. P0002–P0005 match
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
  // clicks "Join". We peek at the invite without locking or consuming it.
  // The RPC re-validates atomically on submit, so this is display-only.
  const { data: invite, error } = await locals.supabase
    .from('group_invites')
    .select('code, group_id, expires_at, revoked_at, max_uses, used_count, groups(name)')
    .eq('code', code)
    .maybeSingle();

  if (error || !invite) {
    return { status: 'invalid' as const, groupName: null, code };
  }

  if (invite.revoked_at !== null) {
    return { status: 'revoked' as const, groupName: null, code };
  }

  if (invite.expires_at !== null && new Date(invite.expires_at) < new Date()) {
    return { status: 'expired' as const, groupName: null, code };
  }

  if (invite.max_uses !== null && invite.used_count >= invite.max_uses) {
    return { status: 'exhausted' as const, groupName: null, code };
  }

  // Check if the caller is already a member of this group so we can route
  // them straight in rather than showing the join button.
  const { data: existing } = await locals.supabase
    .from('group_memberships')
    .select('group_id')
    .eq('group_id', invite.group_id)
    .eq('user_id', locals.user.id)
    .maybeSingle();

  if (existing) {
    throw redirect(303, '/picks');
  }

  const groupName =
    invite.groups && !Array.isArray(invite.groups) ? (invite.groups.name ?? null) : null;

  return { status: 'valid' as const, groupName, code };
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

    // On success (including already-member no-op) the hook resolves the new
    // membership as the active group on the next request.
    throw redirect(303, '/picks');
  }
};

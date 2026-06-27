import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { canCreateGroup } from '$lib/server/settings';
import { invalidateAuthContext } from '$lib/server/auth-context-cache';

const MAX_NAME_LENGTH = 60;

// Friendly messages for the error codes raised by public.create_group. The RPC
// is the real gate; the load below only decides whether to show the form.
function createErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'P0010':
      return 'Enter a group name.';
    case 'P0011':
      return `Group name must be ${MAX_NAME_LENGTH} characters or fewer.`;
    case 'P0012':
      return 'Group creation is not enabled for your account yet.';
    case 'P0001':
      return 'You need to be signed in to create a group.';
    default:
      return 'Could not create the group. Please try again.';
  }
}

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/auth?next=/join');
  return { canCreate: await canCreateGroup(locals.user.id) };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: createErrorMessage('P0001'), name: '' });

    const form = await request.formData();
    const name = String(form.get('name') ?? '').trim();

    // Client-side mirror of the RPC validation for a fast, friendly response.
    if (name.length === 0) return fail(400, { error: createErrorMessage('P0010'), name });
    if (name.length > MAX_NAME_LENGTH)
      return fail(400, { error: createErrorMessage('P0011'), name });

    // Call as the user (cookie-scoped client) so auth.uid() resolves inside the
    // SECURITY DEFINER gate. The RPC enforces the gate authoritatively.
    const { error } = await locals.supabase.rpc('create_group', { p_name: name });
    if (error) {
      return fail(error.code === 'P0012' ? 403 : 400, {
        error: createErrorMessage(error.code),
        name
      });
    }

    // The new commissioner membership makes this the user's active group, but
    // the auth-context cache (ADR-0014) may still hold this user's pre-creation
    // memberships (empty) within its TTL. Bust it now so the immediate redirect
    // to /picks resolves the new membership instead of bouncing back to /join.
    invalidateAuthContext(locals.user.id);

    // The (app) routes resolve the new active group on the next request.
    throw redirect(303, '/picks');
  }
};

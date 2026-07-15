import type { PageServerLoad } from './$types';
import { supabaseService } from '$lib/supabase/service';
import { parseNotificationPrefs, DEFAULT_NOTIFICATION_PREFS } from '$lib/domain/notifications';

/** No active league resolved — the League card doesn't render. */
const NO_LEAGUE = { leagueName: null, aiRecapOptOut: false, isLastCommissioner: false };

export const load: PageServerLoad = async ({ locals }) => {
  // The (app) layout already guarantees a session; null-check for types only.
  if (!locals.user) return { prefs: DEFAULT_NOTIFICATION_PREFS, identities: [], ...NO_LEAGUE };

  const { user, groupId } = locals;

  const [{ data: userData }, { data: idData }, membershipsResult] = await Promise.all([
    supabaseService.from('users').select('notification_prefs').eq('id', user.id).maybeSingle(),
    locals.supabase.auth.getUserIdentities(),
    // One read serves both league knobs (#660): my own `ai_recap_opt_out`, plus every role in
    // the league so the last-commissioner guard on "Leave league" derives without a second
    // round-trip. Same source and shape the /league/manage console reads.
    groupId
      ? supabaseService
          .from('group_memberships')
          .select('user_id, role, ai_recap_opt_out')
          .eq('group_id', groupId)
      : Promise.resolve({ data: null })
  ]);

  const base = {
    prefs: parseNotificationPrefs(userData?.notification_prefs),
    identities: idData?.identities ?? []
  };

  const members = membershipsResult.data;
  const mine = members?.find((m) => m.user_id === user.id);
  if (!groupId || !mine) return { ...base, ...NO_LEAGUE };

  return {
    ...base,
    leagueName: locals.memberships.find((m) => m.groupId === groupId)?.groupName ?? null,
    aiRecapOptOut: mine.ai_recap_opt_out ?? false,
    // Leaving would strand the league with no commissioner — the same rule /api/group/leave
    // enforces server-side. Surfaced here only to explain the disabled button.
    isLastCommissioner:
      mine.role === 'commissioner' && members!.filter((m) => m.role === 'commissioner').length === 1
  };
};

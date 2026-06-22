import type { PageServerLoad } from './$types';
import { supabaseService } from '$lib/supabase/service';
import { parseNotificationPrefs, DEFAULT_NOTIFICATION_PREFS } from '$lib/domain/notifications';

export const load: PageServerLoad = async ({ locals }) => {
  // The (app) layout already guarantees a session; null-check for types only.
  if (!locals.user) return { prefs: DEFAULT_NOTIFICATION_PREFS };

  const { data } = await supabaseService
    .from('users')
    .select('notification_prefs')
    .eq('id', locals.user.id)
    .maybeSingle();

  return { prefs: parseNotificationPrefs(data?.notification_prefs) };
};

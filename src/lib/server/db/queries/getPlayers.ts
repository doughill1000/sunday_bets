import { supabaseService } from '$lib/supabase/service';

export async function getPlayers() {
  return supabaseService
    .from('users')
    .select('id, display_name, avatar_key')
    .order('display_name', { ascending: true });
}

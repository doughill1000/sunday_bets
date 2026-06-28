import { supabaseService } from '$lib/supabase/service';
import type { RecapFacts } from '$lib/types/server/recap';

export type RecapRow = {
  id: string;
  group_id: string;
  season_year: number;
  week_number: number;
  prose: string;
  facts: RecapFacts;
  is_fallback: boolean;
  model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  created_at: string;
};

export async function getLatestRecap(
  groupId: string,
  seasonYear: number
): Promise<RecapRow | null> {
  const { data, error } = await supabaseService
    .from('ai_recaps')
    .select('*')
    .eq('group_id', groupId)
    .eq('season_year', seasonYear)
    .order('week_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as RecapRow | null;
}

export async function getRecapForWeek(
  groupId: string,
  seasonYear: number,
  weekNumber: number
): Promise<RecapRow | null> {
  const { data, error } = await supabaseService
    .from('ai_recaps')
    .select('*')
    .eq('group_id', groupId)
    .eq('season_year', seasonYear)
    .eq('week_number', weekNumber)
    .maybeSingle();
  if (error) throw error;
  return data as RecapRow | null;
}

export async function getRecentRecaps(
  groupId: string,
  seasonYear: number,
  limit = 3
): Promise<RecapRow[]> {
  const { data, error } = await supabaseService
    .from('ai_recaps')
    .select('*')
    .eq('group_id', groupId)
    .eq('season_year', seasonYear)
    .order('week_number', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as RecapRow[];
}

export async function upsertRecap(params: {
  groupId: string;
  seasonYear: number;
  weekNumber: number;
  prose: string;
  facts: RecapFacts;
  isFallback: boolean;
  model: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
}): Promise<void> {
  const { error } = await supabaseService.from('ai_recaps').upsert(
    {
      group_id: params.groupId,
      season_year: params.seasonYear,
      week_number: params.weekNumber,
      prose: params.prose,
      facts: params.facts as unknown as import('$lib/types/supabase').Json,
      is_fallback: params.isFallback,
      model: params.model,
      prompt_tokens: params.promptTokens,
      completion_tokens: params.completionTokens
    },
    { onConflict: 'group_id,season_year,week_number', ignoreDuplicates: false }
  );
  if (error) throw error;
}

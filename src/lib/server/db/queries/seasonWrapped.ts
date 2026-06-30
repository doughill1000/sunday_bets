import { supabaseService } from '$lib/supabase/service';
import type { Json } from '$lib/types/supabase';
import type {
  SeasonWrappedRow,
  WrappedScope,
  PlayerWrappedFacts,
  LeagueWrappedFacts
} from '$lib/types/server/seasonWrapped';

const SELECT_COLS =
  'id, group_id, season_year, scope, subject_user_id, prose, facts, is_fallback, model, prompt_tokens, completion_tokens, created_at';

/** One persisted row for a single subject, or null if not yet generated. */
export async function getSeasonWrappedRow(
  groupId: string,
  seasonYear: number,
  scope: WrappedScope,
  subjectUserId: string | null
): Promise<SeasonWrappedRow | null> {
  let q = supabaseService
    .from('season_wrapped')
    .select(SELECT_COLS)
    .eq('group_id', groupId)
    .eq('season_year', seasonYear)
    .eq('scope', scope);
  q =
    subjectUserId === null ? q.is('subject_user_id', null) : q.eq('subject_user_id', subjectUserId);
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return (data as SeasonWrappedRow | null) ?? null;
}

/** Remove one persisted row by id — used by the force-refresh path (regenerate then replace). */
export async function deleteSeasonWrappedRow(id: string): Promise<void> {
  const { error } = await supabaseService.from('season_wrapped').delete().eq('id', id);
  if (error) throw error;
}

export type SeasonWrappedBundle = {
  league: SeasonWrappedRow | null;
  player: SeasonWrappedRow | null;
};

/** The league row plus the given user's player row for a season (one round-trip). */
export async function getSeasonWrapped(
  groupId: string,
  seasonYear: number,
  userId: string | null
): Promise<SeasonWrappedBundle> {
  const { data, error } = await supabaseService
    .from('season_wrapped')
    .select(SELECT_COLS)
    .eq('group_id', groupId)
    .eq('season_year', seasonYear);
  if (error) throw error;
  const rows = (data ?? []) as SeasonWrappedRow[];
  const league = rows.find((r) => r.scope === 'league') ?? null;
  const player = userId
    ? (rows.find((r) => r.scope === 'player' && r.subject_user_id === userId) ?? null)
    : null;
  return { league, player };
}

/** Seasons that already have a generated Wrapped for this group (newest first) — picker source. */
export async function getWrappedSeasons(groupId: string): Promise<number[]> {
  const { data, error } = await supabaseService
    .from('season_wrapped')
    .select('season_year')
    .eq('group_id', groupId)
    .eq('scope', 'league')
    .order('season_year', { ascending: false });
  if (error) throw error;
  const years = new Set<number>((data ?? []).map((r) => r.season_year as number));
  return [...years].sort((a, b) => b - a);
}

/**
 * Whether a group's season is fully graded, via league_completed_standings (the same
 * completed-season gate the league honors use — #279, ADR-0013). A Wrapped is only
 * generated for complete seasons (#347 AC).
 */
export async function isSeasonComplete(groupId: string, seasonYear: number): Promise<boolean> {
  const { data, error } = await supabaseService
    .from('league_completed_standings')
    .select('season_year')
    .eq('group_id', groupId)
    .eq('season_year', seasonYear)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data != null;
}

/** Distinct (group, completed-season) pairs — the backfill work list. */
export async function listCompletedGroupSeasons(): Promise<
  { groupId: string; seasonYear: number }[]
> {
  const { data, error } = await supabaseService
    .from('league_completed_standings')
    .select('group_id, season_year');
  if (error) throw error;
  const seen = new Set<string>();
  const out: { groupId: string; seasonYear: number }[] = [];
  for (const r of data ?? []) {
    const groupId = r.group_id as string;
    const seasonYear = r.season_year as number;
    if (groupId == null || seasonYear == null) continue;
    const key = `${groupId}:${seasonYear}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ groupId, seasonYear });
  }
  return out;
}

/**
 * Persist one subject's Wrapped. Plain INSERT (not upsert): the orchestrator checks for an
 * existing row first, and the partial unique indexes (one per scope) cannot serve as a
 * PostgREST on_conflict arbiter, so check-then-insert is the idempotency mechanism. A racing
 * duplicate is rejected by the DB and handled by the caller's per-subject error guard.
 */
export async function insertSeasonWrapped(params: {
  groupId: string;
  seasonYear: number;
  scope: WrappedScope;
  subjectUserId: string | null;
  prose: string;
  facts: PlayerWrappedFacts | LeagueWrappedFacts;
  isFallback: boolean;
  model: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
}): Promise<void> {
  const { error } = await supabaseService.from('season_wrapped').insert({
    group_id: params.groupId,
    season_year: params.seasonYear,
    scope: params.scope,
    subject_user_id: params.subjectUserId,
    prose: params.prose,
    facts: params.facts as unknown as Json,
    is_fallback: params.isFallback,
    model: params.model,
    prompt_tokens: params.promptTokens,
    completion_tokens: params.completionTokens
  });
  if (error) throw error;
}

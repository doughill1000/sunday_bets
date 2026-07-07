// Queries for public.ai_badge_flavors (#416). The badge edition of the season_wrapped queries.
// Reads go through the service role (group-scoped by the group_id filter, ADR-0002); all writes
// are service-role only (no client-write policy). Unlike season_wrapped's partial indexes, this
// table has a full UNIQUE (group_id, season_year, badge_id), so writes upsert on that arbiter.
import { supabaseService } from '$lib/supabase/service';
import type { Json } from '$lib/types/supabase';
import type { BadgeFlavorFacts, BadgeFlavorRow } from '$lib/types/server/badgeFlavor';

const SELECT_COLS =
  'id, group_id, season_year, badge_id, flavor, facts, is_fallback, model, prompt_tokens, completion_tokens, created_at';

/** One persisted flavor for a single badge, or null if not yet generated (idempotency probe). */
export async function getBadgeFlavorRow(
  groupId: string,
  seasonYear: number,
  badgeId: string
): Promise<BadgeFlavorRow | null> {
  const { data, error } = await supabaseService
    .from('ai_badge_flavors')
    .select(SELECT_COLS)
    .eq('group_id', groupId)
    .eq('season_year', seasonYear)
    .eq('badge_id', badgeId)
    .maybeSingle();
  if (error) throw error;
  return (data as BadgeFlavorRow | null) ?? null;
}

/**
 * All generated flavors for a group's season as a badge_id → flavor map — the render seam
 * source. Empty for any season with no generated flavors (e.g. in-season), so the caller
 * safely falls back to the static FLAVORS tagline.
 */
export async function getBadgeFlavorMap(
  groupId: string,
  seasonYear: number
): Promise<Map<string, string>> {
  const { data, error } = await supabaseService
    .from('ai_badge_flavors')
    .select('badge_id, flavor')
    .eq('group_id', groupId)
    .eq('season_year', seasonYear);
  if (error) throw error;
  const map = new Map<string, string>();
  for (const row of data ?? []) map.set(row.badge_id as string, row.flavor as string);
  return map;
}

/**
 * Persist one badge's flavor, upserting on the full unique tuple (group_id, season_year,
 * badge_id). The orchestrator voices before calling this, so a failed generation never
 * overwrites an existing row; a successful one replaces it in place.
 */
export async function upsertBadgeFlavor(params: {
  groupId: string;
  seasonYear: number;
  badgeId: string;
  flavor: string;
  facts: BadgeFlavorFacts;
  isFallback: boolean;
  model: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
}): Promise<void> {
  const { error } = await supabaseService.from('ai_badge_flavors').upsert(
    {
      group_id: params.groupId,
      season_year: params.seasonYear,
      badge_id: params.badgeId,
      flavor: params.flavor,
      facts: params.facts as unknown as Json,
      is_fallback: params.isFallback,
      model: params.model,
      prompt_tokens: params.promptTokens,
      completion_tokens: params.completionTokens
    },
    { onConflict: 'group_id,season_year,badge_id' }
  );
  if (error) throw error;
}

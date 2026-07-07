// Badge-flavor orchestrator (#416, epic #283 Wave 3, ADR-0008 boundary 5). The crowned-badge
// edition of seasonWrapped.ts: builds one deterministic packet per awarded badge, voices a
// single tagline under the per-group/season cost budget, and upserts each row. Idempotent —
// badges already voiced are skipped. Per-badge failures are logged and counted, never thrown,
// so one bad tagline never cancels the rest or fails grading.
import { supabaseService } from '$lib/supabase/service';
import {
  buildBadgeFlavorSubjects,
  renderBadgeFallback,
  factsFromSubject
} from '$lib/server/recap/badgeFlavorFacts';
import {
  generateBadgeFlavorProse,
  estimateCostUsd,
  SEASON_MAX_COST_USD,
  type VoiceResult
} from '$lib/server/recap/voice';
import { loadGroupMeta, loadWeekMeta } from '$lib/server/recap/facts';
import { getBadgeFlavorRow, upsertBadgeFlavor } from '$lib/server/db/queries/badgeFlavors';
import { isSeasonComplete } from '$lib/server/db/queries/seasonWrapped';

/**
 * A week is fully graded once every game in it has final scores. Inlined (rather than importing
 * notifications.ts::isWeekFullyGraded) so this module's import graph stays free of the
 * push/Sentry client chain — mirroring seasonWrapped.ts, keeping it integration-test loadable.
 */
async function isWeekFullyGraded(weekId: number): Promise<boolean> {
  const { count, error } = await supabaseService
    .from('games')
    .select('id', { count: 'exact', head: true })
    .eq('week_id', weekId)
    .is('final_scores', null);
  if (error) throw error;
  return (count ?? 0) === 0;
}

export type BadgeFlavorSummary = {
  evaluated: number; // awarded badges considered
  generated: number; // AI taglines persisted
  fallback: number; // deterministic (static) fallback persisted
  skipped: number; // already existed (idempotent skip; never set when force is on)
  replaced: number; // existing row regenerated and overwritten (force only)
};

const EMPTY: BadgeFlavorSummary = {
  evaluated: 0,
  generated: 0,
  fallback: 0,
  skipped: 0,
  replaced: 0
};

export type GenerateBadgeFlavorsOptions = {
  /**
   * Overwrite existing rows instead of skipping them: each badge is re-voiced and its row
   * replaced. The new tagline is persisted only after a successful voice (upsert happens after
   * the gateway call), so a failed regeneration leaves the existing flavor untouched.
   */
  force?: boolean;
};

/**
 * Generate and persist the AI flavor for every awarded badge of one group's completed season.
 * No-op (empty summary) if the season is not complete or the group has AI recaps disabled.
 * Idempotent: badges with an existing row are skipped unless `force` is set.
 */
export async function generateBadgeFlavors(
  groupId: string,
  seasonYear: number,
  options: GenerateBadgeFlavorsOptions = {}
): Promise<BadgeFlavorSummary> {
  const { force = false } = options;
  const summary: BadgeFlavorSummary = { ...EMPTY };

  // Only completed seasons crown badges (#416 AC): in-season badges keep the static tagline.
  if (!(await isSeasonComplete(groupId, seasonYear))) return summary;

  // Respect the group's AI toggle (mirror generateSeasonWrapped's enabled gate).
  const groupMeta = await loadGroupMeta(groupId);
  if (!groupMeta.aiRecapsEnabled) return summary;

  const subjects = await buildBadgeFlavorSubjects({ groupId, seasonYear });

  // Aggregate per-group/season cost budget: once spent, remaining badges fall back without an
  // AI call (the gateway call itself also enforces a per-call guard as defense-in-depth).
  let spentUsd = 0;

  for (const subject of subjects) {
    summary.evaluated++;

    const existing = await getBadgeFlavorRow(groupId, seasonYear, subject.badge_id);
    if (existing && !force) {
      summary.skipped++;
      continue;
    }

    try {
      let voice: VoiceResult;
      if (spentUsd >= SEASON_MAX_COST_USD) {
        voice = {
          prose: renderBadgeFallback(subject),
          is_fallback: true,
          model: null,
          prompt_tokens: null,
          completion_tokens: null
        };
      } else {
        voice = await generateBadgeFlavorProse(subject);
        spentUsd += estimateCostUsd(voice.prompt_tokens, voice.completion_tokens);
      }

      // Upsert on the full unique tuple — replaces the existing row in place, only now that a
      // flavor (AI or fallback) is in hand.
      await upsertBadgeFlavor({
        groupId,
        seasonYear,
        badgeId: subject.badge_id,
        flavor: voice.prose,
        facts: factsFromSubject(subject),
        isFallback: voice.is_fallback,
        model: voice.model,
        promptTokens: voice.prompt_tokens,
        completionTokens: voice.completion_tokens
      });

      if (voice.is_fallback) summary.fallback++;
      else summary.generated++;
      if (existing) summary.replaced++;
    } catch (err) {
      // Log but don't throw — a per-badge failure must not cancel the rest or grading.
      console.error(
        `[badgeFlavor] group=${groupId} season=${seasonYear} badge=${subject.badge_id}:`,
        err
      );
      summary.fallback++;
    }
  }

  return summary;
}

export type SendBadgeFlavorSummary = BadgeFlavorSummary & { groups: number };

/**
 * Season-end entry called by the grade cron after a week is graded. No-op unless the week is
 * fully graded AND it is the final scoring week of its season; otherwise generates badge flavors
 * for every group that participated in this final week (discovered exactly as sendSeasonWrappeds
 * does). Per-group completeness + AI-toggle gates live in generateBadgeFlavors.
 */
export async function sendBadgeFlavors(weekId: number): Promise<SendBadgeFlavorSummary> {
  const empty: SendBadgeFlavorSummary = { ...EMPTY, groups: 0 };

  if (!(await isWeekFullyGraded(weekId))) return empty;

  const { seasonYear, isFinalWeek } = await loadWeekMeta(weekId);
  if (!isFinalWeek) return empty;

  // Groups that had picks in this final week — same discovery lane as sendSeasonWrappeds.
  const { data: games, error: gamesErr } = await supabaseService
    .from('games')
    .select('id')
    .eq('week_id', weekId);
  if (gamesErr) throw gamesErr;
  const gameIds = (games ?? []).map((g) => g.id);
  if (gameIds.length === 0) return empty;

  const { data: picks, error: picksErr } = await supabaseService
    .from('picks')
    .select('group_id')
    .in('game_id', gameIds)
    .not('group_id', 'is', null);
  if (picksErr) throw picksErr;
  const groupIds = [...new Set((picks ?? []).map((p) => p.group_id as string))];

  const totals: SendBadgeFlavorSummary = { ...empty };
  for (const groupId of groupIds) {
    const s = await generateBadgeFlavors(groupId, seasonYear);
    totals.evaluated += s.evaluated;
    totals.generated += s.generated;
    totals.fallback += s.fallback;
    totals.skipped += s.skipped;
    totals.replaced += s.replaced;
    if (s.evaluated > 0) totals.groups++;
  }
  return totals;
}

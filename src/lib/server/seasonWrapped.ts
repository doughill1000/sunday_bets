// Season Wrapped orchestrator (#347, ADR-0008 boundary 7). The season edition of aiRecap.ts:
// builds the deterministic season packet, voices one blurb per subject (league + each active
// player) under a per-group/season cost budget, and persists each row. Idempotent — existing
// subjects are skipped. Per-subject failures are logged and counted, never thrown, so one bad
// blurb never cancels the rest or fails grading.
import { supabaseService } from '$lib/supabase/service';
import {
  buildSeasonWrappedFacts,
  toSeasonWrappedSubjects,
  renderSeasonFallback
} from '$lib/server/recap/seasonFacts';
import {
  generateSeasonProse,
  estimateCostUsd,
  SEASON_MAX_COST_USD,
  type VoiceResult
} from '$lib/server/recap/voice';
import { loadGroupMeta, loadWeekMeta } from '$lib/server/recap/facts';
import {
  getSeasonWrappedRow,
  insertSeasonWrapped,
  isSeasonComplete
} from '$lib/server/db/queries/seasonWrapped';

/**
 * A week is fully graded once every game in it has final scores. Inlined (rather than
 * importing notifications.ts::isWeekFullyGraded) so this server module's import graph stays
 * free of the push/Sentry client chain — keeping it loadable in the node integration tests.
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

export type SeasonWrappedSummary = {
  evaluated: number; // subjects considered (league + active players)
  generated: number; // AI prose persisted
  fallback: number; // deterministic fallback persisted
  skipped: number; // already existed
};

const EMPTY: SeasonWrappedSummary = { evaluated: 0, generated: 0, fallback: 0, skipped: 0 };

/**
 * Generate and persist the Season Wrapped for one group's completed season: one league row
 * plus one row per active player. No-op (empty summary) if the season is not complete or the
 * group has AI recaps disabled. Idempotent: subjects with an existing row are skipped.
 */
export async function generateSeasonWrapped(
  groupId: string,
  seasonYear: number
): Promise<SeasonWrappedSummary> {
  const summary: SeasonWrappedSummary = { ...EMPTY };

  // Only completed seasons get a Wrapped (#347 AC).
  if (!(await isSeasonComplete(groupId, seasonYear))) return summary;

  // Respect the group's AI toggle (mirror sendAIRecaps' enabled gate).
  const groupMeta = await loadGroupMeta(groupId);
  if (!groupMeta.aiRecapsEnabled) return summary;

  const facts = await buildSeasonWrappedFacts({ groupId, seasonYear });
  const subjects = toSeasonWrappedSubjects(facts);

  // Aggregate per-group/season cost budget: once spent, remaining subjects fall back without
  // an AI call (the gateway call itself also enforces a per-call guard as defense-in-depth).
  let spentUsd = 0;

  for (const subject of subjects) {
    summary.evaluated++;

    // Idempotent: skip subjects already persisted for this group/season.
    const existing = await getSeasonWrappedRow(
      groupId,
      seasonYear,
      subject.scope,
      subject.subject_user_id
    );
    if (existing) {
      summary.skipped++;
      continue;
    }

    try {
      let voice: VoiceResult;
      if (spentUsd >= SEASON_MAX_COST_USD) {
        voice = {
          prose: renderSeasonFallback(subject),
          is_fallback: true,
          model: null,
          prompt_tokens: null,
          completion_tokens: null
        };
      } else {
        voice = await generateSeasonProse(subject);
        spentUsd += estimateCostUsd(voice.prompt_tokens, voice.completion_tokens);
      }

      await insertSeasonWrapped({
        groupId,
        seasonYear,
        scope: subject.scope,
        subjectUserId: subject.subject_user_id,
        prose: voice.prose,
        facts: subject.facts,
        isFallback: voice.is_fallback,
        model: voice.model,
        promptTokens: voice.prompt_tokens,
        completionTokens: voice.completion_tokens
      });

      if (voice.is_fallback) summary.fallback++;
      else summary.generated++;
    } catch (err) {
      // Log but don't throw — a per-subject failure must not cancel the rest or grading.
      console.error(
        `[seasonWrapped] group=${groupId} season=${seasonYear} scope=${subject.scope} subject=${subject.subject_user_id}:`,
        err
      );
      summary.fallback++;
    }
  }

  return summary;
}

export type SendSeasonWrappedSummary = SeasonWrappedSummary & { groups: number };

/**
 * Season-end entry called by the grade cron after a week is graded. No-op unless the week is
 * fully graded AND it is the final scoring week of its season; otherwise generates the Wrapped
 * for every group that participated in this final week (groups discovered exactly as
 * sendAIRecaps does). Per-group completeness + AI-toggle gates live in generateSeasonWrapped.
 */
export async function sendSeasonWrappeds(weekId: number): Promise<SendSeasonWrappedSummary> {
  const empty: SendSeasonWrappedSummary = { ...EMPTY, groups: 0 };

  if (!(await isWeekFullyGraded(weekId))) return empty;

  const { seasonYear, isFinalWeek } = await loadWeekMeta(weekId);
  if (!isFinalWeek) return empty;

  // Groups that had picks in this final week — same discovery lane as sendAIRecaps.
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

  const totals: SendSeasonWrappedSummary = { ...empty };
  for (const groupId of groupIds) {
    const s = await generateSeasonWrapped(groupId, seasonYear);
    totals.evaluated += s.evaluated;
    totals.generated += s.generated;
    totals.fallback += s.fallback;
    totals.skipped += s.skipped;
    if (s.evaluated > 0) totals.groups++;
  }
  return totals;
}

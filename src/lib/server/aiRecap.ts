// Post-grading AI recap trigger (ADR-0008, boundary 7).
// Called by the grade cron after sendResultsRecap; errors → Sentry, never fail grading.
import { supabaseService } from '$lib/supabase/service';
import { buildRecapFacts } from '$lib/server/recap/facts';
import { generateRecapProse } from '$lib/server/recap/voice';
import { upsertRecap, getRecapForWeek } from '$lib/server/db/queries/recaps';
import { isWeekFullyGraded } from '$lib/server/notifications';

export type AIRecapSummary = {
  evaluated: number;
  generated: number;
  fallback: number;
  skipped: number;
};

/**
 * For each enabled group that participated in the graded week, generate and persist
 * one AI recap row. Idempotent: if a row already exists for (group, season, week)
 * the group is skipped. Errors on individual groups are captured and counted, not thrown.
 */
export async function sendAIRecaps(weekId: number): Promise<AIRecapSummary> {
  if (!(await isWeekFullyGraded(weekId))) {
    return { evaluated: 0, generated: 0, fallback: 0, skipped: 0 };
  }

  // Resolve week metadata.
  const { data: weekRow, error: weekErr } = await supabaseService
    .from('weeks')
    .select('week_number, seasons!inner(year)')
    .eq('id', weekId)
    .single();
  if (weekErr || !weekRow) throw weekErr ?? new Error('week not found');
  const seasonYear = (weekRow.seasons as { year: number }).year;
  const weekNumber = weekRow.week_number;

  // Find groups that had picks in this week and have ai_recaps_enabled = true.
  const { data: games, error: gamesErr } = await supabaseService
    .from('games')
    .select('id')
    .eq('week_id', weekId);
  if (gamesErr) throw gamesErr;
  const gameIds = (games ?? []).map((g) => g.id);
  if (gameIds.length === 0) return { evaluated: 0, generated: 0, fallback: 0, skipped: 0 };

  const { data: picks, error: picksErr } = await supabaseService
    .from('picks')
    .select('group_id')
    .in('game_id', gameIds)
    .not('group_id', 'is', null);
  if (picksErr) throw picksErr;

  const groupIds = [...new Set((picks ?? []).map((p) => p.group_id as string))];
  if (groupIds.length === 0) return { evaluated: 0, generated: 0, fallback: 0, skipped: 0 };

  // Filter to groups with ai_recaps_enabled = true.
  const { data: configs, error: cfgErr } = await supabaseService
    .from('group_config')
    .select('group_id, ai_recaps_enabled')
    .in('group_id', groupIds);
  if (cfgErr) throw cfgErr;

  const enabledGroupIds = groupIds.filter((id) => {
    const cfg = (configs ?? []).find((c) => c.group_id === id);
    // Default to enabled if no config row exists.
    return (cfg as { ai_recaps_enabled?: boolean } | undefined)?.ai_recaps_enabled !== false;
  });

  const summary: AIRecapSummary = { evaluated: 0, generated: 0, fallback: 0, skipped: 0 };

  for (const groupId of enabledGroupIds) {
    summary.evaluated++;

    // Idempotent: skip if a recap already exists for this group/season/week.
    const existing = await getRecapForWeek(groupId, seasonYear, weekNumber);
    if (existing) {
      summary.skipped++;
      continue;
    }

    try {
      const facts = await buildRecapFacts({ groupId, weekId });
      const voice = await generateRecapProse(facts);

      await upsertRecap({
        groupId,
        seasonYear,
        weekNumber,
        prose: voice.prose,
        facts: facts as Parameters<typeof upsertRecap>[0]['facts'],
        isFallback: voice.is_fallback,
        model: voice.model,
        promptTokens: voice.prompt_tokens,
        completionTokens: voice.completion_tokens
      });

      if (voice.is_fallback) {
        summary.fallback++;
      } else {
        summary.generated++;
      }
    } catch (err) {
      // Log but don't throw — a per-group failure must not cancel other groups or grading.
      console.error(`[aiRecap] group=${groupId} week=${weekId}:`, err);
      summary.fallback++;
    }
  }

  return summary;
}

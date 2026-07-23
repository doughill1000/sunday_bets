// Notification triggers: pick reminders and line-movement alerts.
// Reads/writes via the service role (bypasses RLS); respects per-user
// notification_prefs and dedupes through notification_log.
import * as Sentry from '@sentry/sveltekit';
import { supabaseService } from '$lib/supabase/service';
import { findActiveWeek } from './db/queries/findActiveWeek';
import { sendToUser } from './push';
import {
  parseNotificationPrefs,
  lineShiftForPick,
  shouldNotifyLineShift,
  spreadRelativeToHome,
  pregamePushBody,
  formatRecapBody,
  recapPushBody,
  LINE_SHIFT_THRESHOLD_POINTS,
  type NotificationPrefs,
  type PregameLineShift,
  type RecapTally
} from '$lib/domain/notifications';
import { isGameRemindable, type GroupBoundary } from '$lib/domain/participation';
import type { Json } from '$lib/types/supabase';

// One aligned near-kickoff window for both pregame concerns (#731): the pick
// reminder and the line-shift alert only consider games kicking off within it,
// and a line jump only counts as fresh if its row was synced within it. Floor
// is 60 min (the pregame cron is hourly — tighter and a game could slip between
// runs); 90 gives margin so every game is caught once at 30–90 min out.
const PREGAME_WINDOW_MS = 90 * 60 * 1000;
// At most one line-shift alert per pick within this window (the "per-day" cap).
const LINE_SHIFT_CAP_MS = 24 * 60 * 60 * 1000;
// Canonical odds source — the only one the sync writes (syncOddsForActiveWeek /
// set_active_line default). The previous-row comparison must stay within it.
const LINE_SOURCE = 'fanduel';

export type ReminderSummary = { evaluated: number; sent: number; skipped: number };
export type LineShiftSummary = { evaluated: number; sent: number };
export type PregameSummary = {
  reminders: ReminderSummary;
  lineShifts: LineShiftSummary | { skipped: true } | { error: string };
  /** Merged pushes actually delivered (at most one per user per run). */
  pushes: number;
};
export type RecapSummary = { evaluated: number; sent: number; skipped: number };
export type AIRecapPushSummary = { evaluated: number; sent: number; skipped: number };

async function loadPrefs(userIds: string[]): Promise<Map<string, NotificationPrefs>> {
  const map = new Map<string, NotificationPrefs>();
  if (userIds.length === 0) return map;
  const { data, error } = await supabaseService
    .from('users')
    .select('id, notification_prefs')
    .in('id', userIds);
  if (error) throw error;
  for (const row of data ?? []) {
    map.set(row.id, parseNotificationPrefs(row.notification_prefs));
  }
  return map;
}

async function logNotification(entry: {
  user_id: string;
  kind: string;
  game_id?: string | null;
  week_id?: number | null;
  group_id?: string | null;
  detail?: Json;
}) {
  const { error } = await supabaseService.from('notification_log').insert({
    user_id: entry.user_id,
    kind: entry.kind,
    game_id: entry.game_id ?? null,
    week_id: entry.week_id ?? null,
    group_id: entry.group_id ?? null,
    detail: entry.detail ?? null
  });
  if (error) throw error;
}

/**
 * Count active-week games that kick off within the next `hours`. The pregame
 * cron uses this to decide whether to spend an Odds API call this run.
 */
export async function gamesKickingOffWithin(hours: number, now = new Date()): Promise<number> {
  const week = await findActiveWeek();
  if (!week) return 0;
  const cutoff = new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabaseService
    .from('games')
    .select('id', { count: 'exact', head: true })
    .eq('week_id', week.id)
    .gt('commence_time', now.toISOString())
    .lte('commence_time', cutoff);
  if (error) throw error;
  return count ?? 0;
}

/** One user's qualifying line move, carried from detection to delivery/logging. */
type LineShiftIntent = PregameLineShift & { gameId: string; detail: Json };

/**
 * The single pregame notification pass (#731): evaluate pick reminders and
 * line-shift alerts over the same ~90-min near-kickoff window, then deliver at
 * most ONE merged push per user per run. Every notification_log row is still
 * written per game (reminder dedup + the per-pick line-shift cap) — only the
 * delivery collapses. `includeLineShifts` mirrors the old cron gating: line
 * shifts are only meaningful right after a successful odds sync.
 */
export async function runPregameNotifications(
  now = new Date(),
  { includeLineShifts = true }: { includeLineShifts?: boolean } = {}
): Promise<PregameSummary> {
  const emptyReminders: ReminderSummary = { evaluated: 0, sent: 0, skipped: 0 };
  const emptyLineShifts = (): PregameSummary['lineShifts'] =>
    includeLineShifts ? { evaluated: 0, sent: 0 } : { skipped: true };

  const week = await findActiveWeek();
  if (!week) return { reminders: emptyReminders, lineShifts: emptyLineShifts(), pushes: 0 };

  const nowIso = now.toISOString();
  const windowEnd = new Date(now.getTime() + PREGAME_WINDOW_MS).toISOString();
  const { data: games, error: gamesErr } = await supabaseService
    .from('games')
    .select('id, home_team_id, commence_time')
    .eq('week_id', week.id)
    .gt('commence_time', nowIso)
    .lte('commence_time', windowEnd);
  if (gamesErr) throw gamesErr;
  const gameById = new Map((games ?? []).map((g) => [g.id, g]));
  const gameIds = [...gameById.keys()];
  if (gameIds.length === 0) {
    return { reminders: emptyReminders, lineShifts: emptyLineShifts(), pushes: 0 };
  }

  const { data: allUsers, error: usersErr } = await supabaseService
    .from('users')
    .select('id, notification_prefs');
  if (usersErr) throw usersErr;
  const prefsByUser = new Map(
    (allUsers ?? []).map((u) => [u.id, parseNotificationPrefs(u.notification_prefs)])
  );

  // One picks fetch serves both concerns: existence gates the reminder, the
  // locked side identifies the user's team for the line-shift direction.
  const { data: picks, error: picksErr } = await supabaseService
    .from('picks')
    .select('user_id, game_id, locked_spread_team_id, locked_spread_value')
    .in('game_id', gameIds);
  if (picksErr) throw picksErr;
  const picked = new Set((picks ?? []).map((p) => `${p.user_id}:${p.game_id}`));

  // ---- Pick-reminder intents ------------------------------------------------
  const reminders: ReminderSummary = { evaluated: 0, sent: 0, skipped: 0 };
  const pendingGamesByUser = new Map<string, string[]>();
  const remindable = [...prefsByUser.entries()]
    .filter(([, prefs]) => prefs.enabled && prefs.pick_reminders)
    .map(([id]) => id);
  if (remindable.length > 0) {
    // ADR-0037: don't nag a member about a game before their participation begins. Now that a
    // league can start a future week, this gap bites — so gate each (member, game) on the
    // participation boundary across the member's active leagues (see isGameRemindable).
    const { data: memberships, error: membershipsErr } = await supabaseService
      .from('group_memberships')
      .select('user_id, joined_at, groups(competition_starts_at)')
      .eq('status', 'active')
      .in('user_id', remindable);
    if (membershipsErr) throw membershipsErr;
    const boundariesByUser = new Map<string, GroupBoundary[]>();
    for (const m of memberships ?? []) {
      const group = Array.isArray(m.groups) ? m.groups[0] : m.groups;
      const list = boundariesByUser.get(m.user_id) ?? [];
      list.push({
        competitionStartsAt: group?.competition_starts_at ?? null,
        joinedAt: m.joined_at
      });
      boundariesByUser.set(m.user_id, list);
    }

    const { data: logs, error: logsErr } = await supabaseService
      .from('notification_log')
      .select('user_id, game_id')
      .eq('kind', 'pick_reminder')
      .eq('week_id', week.id)
      .in('user_id', remindable);
    if (logsErr) throw logsErr;
    const reminded = new Set((logs ?? []).map((l) => `${l.user_id}:${l.game_id}`));

    for (const userId of remindable) {
      reminders.evaluated++;
      const pendingGameIds = gameIds.filter(
        (gid) =>
          !picked.has(`${userId}:${gid}`) &&
          !reminded.has(`${userId}:${gid}`) &&
          isGameRemindable(gameById.get(gid)?.commence_time, boundariesByUser.get(userId) ?? [])
      );
      if (pendingGameIds.length === 0) {
        reminders.skipped++;
        continue;
      }
      pendingGamesByUser.set(userId, pendingGameIds);
    }
  }

  // ---- Line-shift intents ---------------------------------------------------
  // A failure here must not cost anyone their pick reminder, so the whole
  // detection pass degrades to an error summary instead of throwing.
  let lineShifts: PregameSummary['lineShifts'] = emptyLineShifts();
  const shiftsByUser = new Map<string, LineShiftIntent[]>();
  if (includeLineShifts) {
    try {
      const summary: LineShiftSummary = { evaluated: 0, sent: 0 };

      const relevantPicks = (picks ?? []).filter(
        (p) =>
          p.locked_spread_team_id !== null &&
          p.locked_spread_value !== null &&
          prefsByUser.get(p.user_id)?.enabled &&
          prefsByUser.get(p.user_id)?.line_shift.enabled
      );

      if (relevantPicks.length > 0) {
        // Full synced history for the window's games (newest first): the row
        // after the active one — same game AND source — is the previous synced
        // line the fresh jump is measured against.
        const { data: lines, error: linesErr } = await supabaseService
          .from('game_lines')
          .select('game_id, spread_team_id, spread_value, is_active_line, fetched_at')
          .in('game_id', gameIds)
          .eq('source', LINE_SOURCE)
          .order('fetched_at', { ascending: false });
        if (linesErr) throw linesErr;
        const linesByGame = new Map<string, NonNullable<typeof lines>>();
        for (const l of lines ?? []) {
          const list = linesByGame.get(l.game_id) ?? [];
          list.push(l);
          linesByGame.set(l.game_id, list);
        }

        // Per-pick cap: any line_shift alert for this (user, game) within the cap window.
        const capSince = new Date(now.getTime() - LINE_SHIFT_CAP_MS).toISOString();
        const { data: recentLogs, error: recentErr } = await supabaseService
          .from('notification_log')
          .select('user_id, game_id')
          .eq('kind', 'line_shift')
          .in('game_id', gameIds)
          .gte('created_at', capSince);
        if (recentErr) throw recentErr;
        const recentlyNotified = new Set(
          (recentLogs ?? []).filter((l) => l.game_id).map((l) => `${l.user_id}:${l.game_id}`)
        );

        // Short names for the push copy ("your Bills pick").
        const pickedTeamIds = [
          ...new Set(relevantPicks.map((p) => p.locked_spread_team_id as number))
        ];
        const { data: teams, error: teamsErr } = await supabaseService
          .from('teams')
          .select('id, short_name')
          .in('id', pickedTeamIds);
        if (teamsErr) throw teamsErr;
        const teamName = new Map((teams ?? []).map((t) => [t.id, t.short_name]));

        const freshSince = now.getTime() - PREGAME_WINDOW_MS;
        for (const pick of relevantPicks) {
          const game = gameById.get(pick.game_id);
          const history = linesByGame.get(pick.game_id) ?? [];
          const activeIdx = history.findIndex((l) => l.is_active_line);
          const current = activeIdx === -1 ? undefined : history[activeIdx];
          if (!game || !current) continue;

          summary.evaluated++;

          const previous = history[activeIdx + 1];
          if (!previous) continue;

          const pickedTeamId = pick.locked_spread_team_id as number;
          const shift = lineShiftForPick({
            pickedTeamId,
            previousTeamId: previous.spread_team_id,
            previousValue: Number(previous.spread_value),
            currentTeamId: current.spread_team_id,
            currentValue: Number(current.spread_value)
          });

          if (
            !shouldNotifyLineShift({
              movement: shift.points,
              direction: shift.direction,
              freshJump: new Date(current.fetched_at).getTime() >= freshSince,
              lineShiftEnabled: true,
              recentlyNotified: recentlyNotified.has(`${pick.user_id}:${pick.game_id}`)
            })
          ) {
            continue;
          }

          const intents = shiftsByUser.get(pick.user_id) ?? [];
          intents.push({
            gameId: pick.game_id,
            team: teamName.get(pickedTeamId) ?? 'pick',
            points: shift.points,
            detail: {
              from: spreadRelativeToHome(
                previous.spread_team_id,
                Number(previous.spread_value),
                game.home_team_id
              ),
              to: spreadRelativeToHome(
                current.spread_team_id,
                Number(current.spread_value),
                game.home_team_id
              ),
              points: shift.points,
              threshold: LINE_SHIFT_THRESHOLD_POINTS
            }
          });
          shiftsByUser.set(pick.user_id, intents);
          // Prevent a second alert for this pick in the same run.
          recentlyNotified.add(`${pick.user_id}:${pick.game_id}`);
        }
      }

      lineShifts = summary;
    } catch (e) {
      Sentry.captureException(e);
      shiftsByUser.clear();
      lineShifts = { error: e instanceof Error ? e.message : 'line-shift detection failed' };
    }
  }

  // ---- Merged delivery ------------------------------------------------------
  let pushes = 0;
  const dueUsers = new Set([...pendingGamesByUser.keys(), ...shiftsByUser.keys()]);
  for (const userId of dueUsers) {
    const pendingGameIds = pendingGamesByUser.get(userId) ?? [];
    const shifts = shiftsByUser.get(userId) ?? [];
    const content = pregamePushBody({
      unpickedCount: pendingGameIds.length,
      lineShifts: shifts.map(({ team, points }) => ({ team, points }))
    });
    if (!content) continue;

    await sendToUser(userId, {
      ...content,
      url: '/picks',
      tag: `pregame-week-${week.id}`
    });
    pushes++;

    for (const gid of pendingGameIds) {
      await logNotification({
        user_id: userId,
        kind: 'pick_reminder',
        game_id: gid,
        week_id: week.id
      });
    }
    if (pendingGameIds.length > 0) reminders.sent++;

    for (const shift of shifts) {
      await logNotification({
        user_id: userId,
        kind: 'line_shift',
        game_id: shift.gameId,
        week_id: week.id,
        detail: shift.detail
      });
      if ('sent' in lineShifts) lineShifts.sent++;
    }
  }

  return { reminders, lineShifts, pushes };
}

/**
 * A week is recap-ready only once every game in it has been settled (final
 * scores present). Mirrors the completeness notion `advance_week_if_complete`
 * enforces, so partial-week grade runs don't fire a recap early.
 */
export async function isWeekFullyGraded(weekId: number): Promise<boolean> {
  const { count, error } = await supabaseService
    .from('games')
    .select('id', { count: 'exact', head: true })
    .eq('week_id', weekId)
    .is('final_scores', null);
  if (error) throw error;
  return (count ?? 0) === 0;
}

/**
 * Post-grading recap: once a week is fully settled, send each opted-in user a
 * single push summarizing their week (record + net points), aggregated across
 * all of their groups. Deduped per (user, week) via notification_log so repeated
 * grade-cron runs don't re-send. No-op until the week is complete.
 */
export async function sendResultsRecap(weekId: number): Promise<RecapSummary> {
  if (!(await isWeekFullyGraded(weekId))) return { evaluated: 0, sent: 0, skipped: 0 };

  const { data: week, error: weekErr } = await supabaseService
    .from('weeks')
    .select('week_number')
    .eq('id', weekId)
    .single();
  if (weekErr) throw weekErr;

  const { data: games, error: gamesErr } = await supabaseService
    .from('games')
    .select('id')
    .eq('week_id', weekId);
  if (gamesErr) throw gamesErr;
  const gameIds = (games ?? []).map((g) => g.id);
  if (gameIds.length === 0) return { evaluated: 0, sent: 0, skipped: 0 };

  const { data: allUsers, error: usersErr } = await supabaseService
    .from('users')
    .select('id, notification_prefs');
  if (usersErr) throw usersErr;
  const notifiable = (allUsers ?? [])
    .map((u) => ({ id: u.id, prefs: parseNotificationPrefs(u.notification_prefs) }))
    .filter((u) => u.prefs.enabled && u.prefs.results_recap);
  if (notifiable.length === 0) return { evaluated: 0, sent: 0, skipped: 0 };
  const userIds = notifiable.map((u) => u.id);

  // Per-(user, week) dedup: skip anyone already recapped for this week.
  const { data: logs, error: logsErr } = await supabaseService
    .from('notification_log')
    .select('user_id')
    .eq('kind', 'results_recap')
    .eq('week_id', weekId)
    .in('user_id', userIds);
  if (logsErr) throw logsErr;
  const recapped = new Set((logs ?? []).map((l) => l.user_id));

  // Aggregate each user's settlements across all groups for the week's games.
  const { data: settlements, error: setErr } = await supabaseService
    .from('pick_settlement')
    .select('user_id, outcome, points_delta')
    .in('game_id', gameIds)
    .in('user_id', userIds);
  if (setErr) throw setErr;

  const tallies = new Map<string, RecapTally>();
  for (const s of settlements ?? []) {
    const t = tallies.get(s.user_id) ?? { wins: 0, losses: 0, pushes: 0, missed: 0, net: 0 };
    if (s.outcome === 'win') t.wins++;
    else if (s.outcome === 'loss') t.losses++;
    else if (s.outcome === 'push') t.pushes++;
    else if (s.outcome === 'missed') t.missed++;
    t.net += s.points_delta ?? 0;
    tallies.set(s.user_id, t);
  }

  let evaluated = 0;
  let sent = 0;
  let skipped = 0;

  for (const user of notifiable) {
    const tally = tallies.get(user.id);
    // Nothing to report (no settlements) or already recapped this week.
    if (!tally || recapped.has(user.id)) {
      skipped++;
      continue;
    }
    evaluated++;

    await sendToUser(user.id, {
      title: `Your Week ${week.week_number} results`,
      body: formatRecapBody(tally),
      url: '/league',
      tag: `results-recap-week-${weekId}`
    });
    await logNotification({
      user_id: user.id,
      kind: 'results_recap',
      week_id: weekId,
      detail: {
        wins: tally.wins,
        losses: tally.losses,
        pushes: tally.pushes,
        missed: tally.missed,
        net: tally.net
      }
    });
    sent++;
  }

  return { evaluated, sent, skipped };
}

/**
 * Push each opted-in group member a "recap ready" notification once their
 * group's AI recap has been generated for a week (#302, reuses the #178
 * sendResultsRecap dedup shape). Evaluates whichever `ai_recaps` rows exist for
 * the week — generation (sendAIRecaps) is the gate, so a group with no row yet
 * (disabled, or not fully graded) is simply not evaluated here. Deduped per
 * (user, group, week) via notification_log so repeated grade-cron runs don't
 * re-send.
 */
export async function sendAIRecapPushes(weekId: number): Promise<AIRecapPushSummary> {
  const { data: weekRow, error: weekErr } = await supabaseService
    .from('weeks')
    .select('week_number, seasons!inner(year)')
    .eq('id', weekId)
    .single();
  if (weekErr || !weekRow) return { evaluated: 0, sent: 0, skipped: 0 };
  const seasonYear = (weekRow.seasons as { year: number }).year;
  const weekNumber = weekRow.week_number;

  const { data: recaps, error: recapErr } = await supabaseService
    .from('ai_recaps')
    .select('group_id, prose')
    .eq('season_year', seasonYear)
    .eq('week_number', weekNumber);
  if (recapErr) throw recapErr;
  // One recap row per (group, season, week); keep each group's prose for the push body.
  const proseByGroup = new Map<string, string>();
  for (const r of recaps ?? []) {
    if (!proseByGroup.has(r.group_id)) proseByGroup.set(r.group_id, r.prose);
  }
  const groupIds = [...proseByGroup.keys()];
  if (groupIds.length === 0) return { evaluated: 0, sent: 0, skipped: 0 };

  const { data: memberships, error: memErr } = await supabaseService
    .from('group_memberships')
    .select('group_id, user_id')
    .in('group_id', groupIds)
    .eq('status', 'active');
  if (memErr) throw memErr;
  if (!memberships || memberships.length === 0) return { evaluated: 0, sent: 0, skipped: 0 };

  const prefsByUser = await loadPrefs([...new Set(memberships.map((m) => m.user_id))]);

  // Per-(user, group, week) dedup: skip anyone already pushed for this group/week.
  const { data: logs, error: logsErr } = await supabaseService
    .from('notification_log')
    .select('user_id, group_id')
    .eq('kind', 'ai_recap')
    .eq('week_id', weekId)
    .in('group_id', groupIds);
  if (logsErr) throw logsErr;
  const notified = new Set((logs ?? []).map((l) => `${l.user_id}:${l.group_id}`));

  let evaluated = 0;
  let sent = 0;
  let skipped = 0;

  for (const { group_id, user_id } of memberships) {
    const prefs = prefsByUser.get(user_id);
    if (!prefs?.enabled || !prefs.ai_recap) continue;
    evaluated++;

    if (notified.has(`${user_id}:${group_id}`)) {
      skipped++;
      continue;
    }

    await sendToUser(user_id, {
      title: `Week ${weekNumber} recap is ready`,
      body: recapPushBody(proseByGroup.get(group_id) ?? ''),
      // Season-qualified deep link (#739): `?season=` lands on this week's archive even after a
      // newer season starts grading, and `#week-N` scrolls straight to its hardware + recap.
      url: `/recap?season=${seasonYear}#week-${weekNumber}`,
      tag: `ai-recap-${group_id}-week-${weekId}`
    });
    await logNotification({
      user_id,
      kind: 'ai_recap',
      week_id: weekId,
      group_id
    });
    notified.add(`${user_id}:${group_id}`);
    sent++;
  }

  return { evaluated, sent, skipped };
}

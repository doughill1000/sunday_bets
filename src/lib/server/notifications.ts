// Notification triggers: pick reminders and line-movement alerts.
// Reads/writes via the service role (bypasses RLS); respects per-user
// notification_prefs and dedupes through notification_log.
import { supabaseService } from '$lib/supabase/service';
import { findActiveWeek } from './db/queries/findActiveWeek';
import { sendToUser } from './push';
import {
  parseNotificationPrefs,
  lineMovementPoints,
  shouldNotifyLineShift,
  spreadRelativeToHome,
  formatRecapBody,
  type NotificationPrefs,
  type RecapTally
} from '$lib/domain/notifications';
import type { Json } from '$lib/types/supabase';

// Remind ~2–3h before kickoff (hourly cron + this window catches each game once).
const REMINDER_LOOKAHEAD_MS = 3 * 60 * 60 * 1000;
// Only alert on line moves for games kicking off within this window.
const LINE_SHIFT_WINDOW_MS = 24 * 60 * 60 * 1000;
// At most one line-shift alert per pick within this window (the "per-day" cap).
const LINE_SHIFT_CAP_MS = 24 * 60 * 60 * 1000;

export type ReminderSummary = { evaluated: number; sent: number; skipped: number };
export type LineShiftSummary = { evaluated: number; sent: number };
export type RecapSummary = { evaluated: number; sent: number; skipped: number };

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
  detail?: Json;
}) {
  const { error } = await supabaseService.from('notification_log').insert({
    user_id: entry.user_id,
    kind: entry.kind,
    game_id: entry.game_id ?? null,
    week_id: entry.week_id ?? null,
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

/**
 * Nudge users who still have unpicked games kicking off within ~3h. Sends at
 * most one consolidated push per user per run; each reminded game is logged so
 * a user isn't re-nudged for the same game.
 */
export async function sendPickReminders(now = new Date()): Promise<ReminderSummary> {
  const week = await findActiveWeek();
  if (!week) return { evaluated: 0, sent: 0, skipped: 0 };

  const nowIso = now.toISOString();
  const cutoff = new Date(now.getTime() + REMINDER_LOOKAHEAD_MS).toISOString();

  const { data: games, error: gamesErr } = await supabaseService
    .from('games')
    .select('id')
    .eq('week_id', week.id)
    .gt('commence_time', nowIso)
    .lte('commence_time', cutoff);
  if (gamesErr) throw gamesErr;
  const gameIds = (games ?? []).map((g) => g.id);
  if (gameIds.length === 0) return { evaluated: 0, sent: 0, skipped: 0 };

  const { data: allUsers, error: usersErr } = await supabaseService
    .from('users')
    .select('id, notification_prefs');
  if (usersErr) throw usersErr;
  const notifiable = (allUsers ?? [])
    .map((u) => ({ id: u.id, prefs: parseNotificationPrefs(u.notification_prefs) }))
    .filter((u) => u.prefs.enabled && u.prefs.pick_reminders);
  if (notifiable.length === 0) return { evaluated: 0, sent: 0, skipped: 0 };
  const userIds = notifiable.map((u) => u.id);

  const { data: picks, error: picksErr } = await supabaseService
    .from('picks')
    .select('user_id, game_id')
    .in('game_id', gameIds)
    .in('user_id', userIds);
  if (picksErr) throw picksErr;
  const picked = new Set((picks ?? []).map((p) => `${p.user_id}:${p.game_id}`));

  const { data: logs, error: logsErr } = await supabaseService
    .from('notification_log')
    .select('user_id, game_id')
    .eq('kind', 'pick_reminder')
    .eq('week_id', week.id)
    .in('user_id', userIds);
  if (logsErr) throw logsErr;
  const reminded = new Set((logs ?? []).map((l) => `${l.user_id}:${l.game_id}`));

  let evaluated = 0;
  let sent = 0;
  let skipped = 0;

  for (const user of notifiable) {
    evaluated++;
    const pendingGameIds = gameIds.filter(
      (gid) => !picked.has(`${user.id}:${gid}`) && !reminded.has(`${user.id}:${gid}`)
    );
    if (pendingGameIds.length === 0) {
      skipped++;
      continue;
    }

    const count = pendingGameIds.length;
    await sendToUser(user.id, {
      title: 'Picks lock soon',
      body:
        count === 1
          ? 'You have 1 unpicked game kicking off in the next few hours.'
          : `You have ${count} unpicked games kicking off in the next few hours.`,
      url: '/picks',
      tag: `pick-reminder-week-${week.id}`
    });

    for (const gid of pendingGameIds) {
      await logNotification({
        user_id: user.id,
        kind: 'pick_reminder',
        game_id: gid,
        week_id: week.id
      });
    }
    sent++;
  }

  return { evaluated, sent, skipped };
}

/**
 * Alert users when the active line on a game they've picked (kicking off within
 * 24h) has moved by at least their per-user threshold versus their snapshot.
 * Capped at one alert per pick per 24h. Intended to run after a near-kickoff
 * odds sync.
 */
export async function detectLineShifts(now = new Date()): Promise<LineShiftSummary> {
  const week = await findActiveWeek();
  if (!week) return { evaluated: 0, sent: 0 };

  const nowIso = now.toISOString();
  const windowEnd = new Date(now.getTime() + LINE_SHIFT_WINDOW_MS).toISOString();
  const { data: games, error: gamesErr } = await supabaseService
    .from('games')
    .select('id, home_team_id, commence_time')
    .eq('week_id', week.id)
    .gt('commence_time', nowIso)
    .lte('commence_time', windowEnd);
  if (gamesErr) throw gamesErr;
  const gameById = new Map((games ?? []).map((g) => [g.id, g]));
  const gameIds = [...gameById.keys()];
  if (gameIds.length === 0) return { evaluated: 0, sent: 0 };

  const { data: lines, error: linesErr } = await supabaseService
    .from('game_lines')
    .select('game_id, spread_team_id, spread_value')
    .in('game_id', gameIds)
    .eq('is_active_line', true);
  if (linesErr) throw linesErr;
  const lineByGame = new Map((lines ?? []).map((l) => [l.game_id, l]));

  const { data: picks, error: picksErr } = await supabaseService
    .from('picks')
    .select('user_id, game_id, locked_spread_team_id, locked_spread_value')
    .in('game_id', gameIds);
  if (picksErr) throw picksErr;
  const relevantPicks = (picks ?? []).filter(
    (p) => p.locked_spread_team_id !== null && p.locked_spread_value !== null
  );
  if (relevantPicks.length === 0) return { evaluated: 0, sent: 0 };

  const prefsByUser = await loadPrefs([...new Set(relevantPicks.map((p) => p.user_id))]);

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

  let evaluated = 0;
  let sent = 0;

  for (const pick of relevantPicks) {
    const prefs = prefsByUser.get(pick.user_id);
    if (!prefs?.enabled || !prefs.line_shift.enabled) continue;
    const game = gameById.get(pick.game_id);
    const line = lineByGame.get(pick.game_id);
    if (!game || !line) continue;

    evaluated++;

    const lockedTeamId = pick.locked_spread_team_id as number;
    const lockedValue = Number(pick.locked_spread_value);
    const currentTeamId = line.spread_team_id;
    const currentValue = Number(line.spread_value);

    const movement = lineMovementPoints({
      homeTeamId: game.home_team_id,
      lockedTeamId,
      lockedValue,
      currentTeamId,
      currentValue
    });
    const from = spreadRelativeToHome(lockedTeamId, lockedValue, game.home_team_id);
    const to = spreadRelativeToHome(currentTeamId, currentValue, game.home_team_id);

    if (
      !shouldNotifyLineShift({
        movement,
        threshold: prefs.line_shift.threshold,
        lineShiftEnabled: prefs.line_shift.enabled,
        recentlyNotified: recentlyNotified.has(`${pick.user_id}:${pick.game_id}`)
      })
    ) {
      continue;
    }

    await sendToUser(pick.user_id, {
      title: 'Line moved on your pick',
      body: `A line you picked moved ${movement} point${movement === 1 ? '' : 's'}. Tap to review before kickoff.`,
      url: '/picks',
      tag: `line-shift-${pick.game_id}`
    });
    await logNotification({
      user_id: pick.user_id,
      kind: 'line_shift',
      game_id: pick.game_id,
      week_id: week.id,
      detail: { from, to, threshold: prefs.line_shift.threshold }
    });
    // Prevent a second alert for this pick in the same run.
    recentlyNotified.add(`${pick.user_id}:${pick.game_id}`);
    sent++;
  }

  return { evaluated, sent };
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
      url: '/leaderboard',
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

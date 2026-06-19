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
  type NotificationPrefs
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

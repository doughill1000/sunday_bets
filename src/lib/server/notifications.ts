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

const REMINDER_WINDOW_MS = 48 * 60 * 60 * 1000;

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
 * Nudge users who still have unpicked games kicking off within 48h. Sends at
 * most one consolidated push per user per run; each reminded game is logged so
 * a user isn't re-nudged for the same game (but a fresh push fires when a new
 * game enters the window).
 */
export async function sendPickReminders(now = new Date()): Promise<ReminderSummary> {
  const week = await findActiveWeek();
  if (!week) return { evaluated: 0, sent: 0, skipped: 0 };

  const nowIso = now.toISOString();
  const cutoff = new Date(now.getTime() + REMINDER_WINDOW_MS).toISOString();

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

    const unpickedCount = gameIds.filter((gid) => !picked.has(`${user.id}:${gid}`)).length;
    await sendToUser(user.id, {
      title: 'Picks due soon',
      body:
        unpickedCount === 1
          ? 'You have 1 game without a pick kicking off within 48 hours.'
          : `You have ${unpickedCount} games without picks kicking off within 48 hours.`,
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
 * Alert users when the active line on a game they've already picked has moved
 * by at least their per-user threshold versus their snapshot. Deduped so a
 * line sitting past threshold across repeated syncs only fires once (unless it
 * moves further). Intended to run right after a successful odds sync.
 */
export async function detectLineShifts(now = new Date()): Promise<LineShiftSummary> {
  const week = await findActiveWeek();
  if (!week) return { evaluated: 0, sent: 0 };

  const nowIso = now.toISOString();
  const { data: games, error: gamesErr } = await supabaseService
    .from('games')
    .select('id, home_team_id, commence_time')
    .eq('week_id', week.id)
    .gt('commence_time', nowIso);
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

  const { data: priorLogs, error: priorErr } = await supabaseService
    .from('notification_log')
    .select('user_id, game_id, detail, created_at')
    .eq('kind', 'line_shift')
    .in('game_id', gameIds)
    .order('created_at', { ascending: false });
  if (priorErr) throw priorErr;
  const lastNotifiedTo = new Map<string, number>();
  for (const log of priorLogs ?? []) {
    if (!log.game_id) continue;
    const key = `${log.user_id}:${log.game_id}`;
    if (lastNotifiedTo.has(key)) continue; // ordered desc → first seen is newest
    const detail = log.detail;
    if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
      const to = (detail as Record<string, unknown>).to;
      if (typeof to === 'number') lastNotifiedTo.set(key, to);
    }
  }

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
    const key = `${pick.user_id}:${pick.game_id}`;

    if (
      !shouldNotifyLineShift({
        movement,
        threshold: prefs.line_shift.threshold,
        lineShiftEnabled: prefs.line_shift.enabled,
        lastNotifiedTo: lastNotifiedTo.has(key) ? (lastNotifiedTo.get(key) as number) : null,
        currentTo: to
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
    sent++;
  }

  return { evaluated, sent };
}

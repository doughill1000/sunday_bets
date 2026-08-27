// Notification triggers: pick reminders and line-movement alerts.
// Reads/writes via the service role (bypasses RLS); respects per-user
// notification_prefs and dedupes through notification_log.
import * as Sentry from '@sentry/sveltekit';
import { supabaseService } from '$lib/supabase/service';
import { findActiveWeek } from './db/queries/findActiveWeek';
import { isScoringWeek } from './db/queries/isScoringWeek';
import { isWeekFullyGraded } from './db/queries/isWeekFullyGraded';
import { sendToUser, type SendResult } from './push';
import {
  parseNotificationPrefs,
  lineShiftForPick,
  shouldNotifyLineShift,
  spreadRelativeToHome,
  pregamePushBody,
  weeklyRecapPushBody,
  holdsDedupSlot,
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

/**
 * Every push-sending pass in this module reports attempts and deliveries separately
 * (#815). The `sent`/`pushes` counters are **attempts** — what the run decided to
 * push. `delivered` sums `sendToUser`'s own `sent`, i.e. the subscriptions that
 * actually took it. A pass with attempts > 0 and `delivered: 0` is a delivery
 * outage; before this distinction existed such a run was indistinguishable from a
 * healthy one in `cron_run_log.summary`, which is how a seven-week silent-push
 * failure went unnoticed.
 */
export type ReminderSummary = { evaluated: number; sent: number; skipped: number };
export type LineShiftSummary = { evaluated: number; sent: number };
/**
 * Why a run evaluated no line shifts at all, kept distinct from a real zero so the
 * cron log says which (#793). `no odds sync` is the caller's `includeLineShifts:
 * false` — a run with no fresh odds behind it; `non-scoring round` is ADR-0016.
 */
export type LineShiftSkipped = { skipped: true; reason: 'no odds sync' | 'non-scoring round' };
export type PregameSummary = {
  reminders: ReminderSummary;
  lineShifts: LineShiftSummary | LineShiftSkipped | { error: string };
  /** Merged pushes **attempted** (at most one per user per run). */
  pushes: number;
  /** Subscriptions that accepted one of those pushes. `pushes > 0, delivered: 0` = outage. */
  delivered: number;
};
/**
 * Per-concern accounting inside the merged weekly recap (#813). `evaluated` counts
 * the candidates that concern considered after its opt-in filter — users for results,
 * (user, group) pairs for AI recaps — and every one of them lands in exactly one of
 * `sent` or `skipped`. Both concerns use the same definition, which the two
 * pre-merge summaries did not.
 */
export type WeeklyRecapConcern = { evaluated: number; sent: number; skipped: number };
export type WeeklyRecapSummary = {
  results: WeeklyRecapConcern;
  aiRecaps: WeeklyRecapConcern;
  /** Merged pushes **attempted** (at most one per user per group per run). */
  pushes: number;
  /** Subscriptions that accepted one. `pushes > 0, delivered: 0` = outage. */
  delivered: number;
};

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

/**
 * Write one `notification_log` row. `delivery` is mandatory (#815): these rows are
 * both the audit trail and the dedup ledger, so every one of them records what its
 * push actually achieved under `detail.delivery`. A row that claims a notification
 * without that evidence is the bug this closes — and `holdsDedupSlot` reads the
 * value back to decide whether the row suppresses a re-send.
 */
async function logNotification(entry: {
  user_id: string;
  kind: string;
  game_id?: string | null;
  week_id?: number | null;
  group_id?: string | null;
  detail?: Record<string, Json>;
  delivery: SendResult;
}) {
  const { sent, total, pruned } = entry.delivery;
  const { error } = await supabaseService.from('notification_log').insert({
    user_id: entry.user_id,
    kind: entry.kind,
    game_id: entry.game_id ?? null,
    week_id: entry.week_id ?? null,
    group_id: entry.group_id ?? null,
    detail: { ...(entry.detail ?? {}), delivery: { sent, total, pruned } }
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
type LineShiftIntent = PregameLineShift & { gameId: string; detail: Record<string, Json> };

/**
 * The single pregame notification pass (#731): evaluate pick reminders and
 * line-shift alerts over the same ~90-min near-kickoff window, then deliver at
 * most ONE merged push per user per run. Every notification_log row is still
 * written per game (reminder dedup + the per-pick line-shift cap) — only the
 * delivery collapses. `includeLineShifts` mirrors the old cron gating: line
 * shifts are only meaningful right after a successful odds sync.
 *
 * On a non-scoring round the two lanes get opposite answers (#793): the reminder
 * still fires (and says the round doesn't count), the line-shift alert does not.
 */
export async function runPregameNotifications(
  now = new Date(),
  { includeLineShifts = true }: { includeLineShifts?: boolean } = {}
): Promise<PregameSummary> {
  const emptyReminders: ReminderSummary = { evaluated: 0, sent: 0, skipped: 0 };
  const noOddsSync: LineShiftSkipped = { skipped: true, reason: 'no odds sync' };

  const week = await findActiveWeek();
  if (!week) {
    return {
      reminders: emptyReminders,
      lineShifts: includeLineShifts ? { evaluated: 0, sent: 0 } : noOddsSync,
      pushes: 0,
      delivered: 0
    };
  }

  // ADR-0016 / #793: a non-scoring round (preseason, or any future practice round)
  // notifies you about *picking* and nothing else. A line-shift alert only means
  // something because a moving line changes what your pick is worth, and on a round
  // worth zero there is nothing to react to — so its whole detection pass is skipped.
  // The pick reminder deliberately survives: preseason is the onboarding runway, the
  // round where people learn the loop on games where being wrong is free.
  //
  // The gate therefore sits on line-shift DETECTION, not on this function and not on
  // the merged delivery loop below — #731 collapsed both lanes into one push per user,
  // so gating either of those would silently take the reminder down with it.
  const scoringRound = await isScoringWeek(week.id);
  const detectLineShifts = includeLineShifts && scoringRound;
  const idleLineShifts = (): PregameSummary['lineShifts'] =>
    !includeLineShifts
      ? noOddsSync
      : scoringRound
        ? { evaluated: 0, sent: 0 }
        : { skipped: true, reason: 'non-scoring round' };

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
    return { reminders: emptyReminders, lineShifts: idleLineShifts(), pushes: 0, delivered: 0 };
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

    // #815: a logged reminder only suppresses a re-send if it actually reached a
    // device — see holdsDedupSlot. A push that died on the wire releases its slot
    // and is retried next run, which the ~90-min window bounds to one extra attempt.
    const { data: logs, error: logsErr } = await supabaseService
      .from('notification_log')
      .select('user_id, game_id, detail')
      .eq('kind', 'pick_reminder')
      .eq('week_id', week.id)
      .in('user_id', remindable);
    if (logsErr) throw logsErr;
    const reminded = new Set(
      (logs ?? []).filter((l) => holdsDedupSlot(l.detail)).map((l) => `${l.user_id}:${l.game_id}`)
    );

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
  let lineShifts: PregameSummary['lineShifts'] = idleLineShifts();
  const shiftsByUser = new Map<string, LineShiftIntent[]>();
  if (detectLineShifts) {
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
          .select('user_id, game_id, detail')
          .eq('kind', 'line_shift')
          .in('game_id', gameIds)
          .gte('created_at', capSince);
        if (recentErr) throw recentErr;
        // An alert that reached nobody didn't spend the once-per-pick-per-day cap (#815).
        const recentlyNotified = new Set(
          (recentLogs ?? [])
            .filter((l) => l.game_id && holdsDedupSlot(l.detail))
            .map((l) => `${l.user_id}:${l.game_id}`)
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
  let delivered = 0;
  const dueUsers = new Set([...pendingGamesByUser.keys(), ...shiftsByUser.keys()]);
  for (const userId of dueUsers) {
    const pendingGameIds = pendingGamesByUser.get(userId) ?? [];
    const shifts = shiftsByUser.get(userId) ?? [];
    const content = pregamePushBody({
      unpickedCount: pendingGameIds.length,
      lineShifts: shifts.map(({ team, points }) => ({ team, points })),
      scoring: scoringRound
    });
    if (!content) continue;

    // The one place that knows whether this push reached a device — carried into
    // both the summary and every log row it writes, never discarded (#815).
    const result = await sendToUser(userId, {
      ...content,
      url: '/picks',
      tag: `pregame-week-${week.id}`
    });
    pushes++;
    delivered += result.sent;

    for (const gid of pendingGameIds) {
      await logNotification({
        user_id: userId,
        kind: 'pick_reminder',
        game_id: gid,
        week_id: week.id,
        delivery: result
      });
    }
    if (pendingGameIds.length > 0) reminders.sent++;

    for (const shift of shifts) {
      await logNotification({
        user_id: userId,
        kind: 'line_shift',
        game_id: shift.gameId,
        week_id: week.id,
        detail: shift.detail,
        delivery: result
      });
      if ('sent' in lineShifts) lineShifts.sent++;
    }
  }

  return { reminders, lineShifts, pushes, delivered };
}

/**
 * The single post-grading notification pass (#813), structured like
 * `runPregameNotifications`: detect each concern independently, then deliver ONE
 * merged push per (user, group). Before this, the Tuesday-morning cron called two
 * senders back-to-back and an opted-in user's phone buzzed twice within seconds
 * with the two halves of the same "your week is in" moment — their own record, and
 * their league's AI beat. Only delivery merges; both preference toggles and both
 * `notification_log` kinds stay exactly as they were.
 *
 * The two gates are deliberately asymmetric and each stays on its own concern:
 *
 * - `isScoringWeek` gates the whole pass (#789). Neither half has anything to say
 *   about a round that moved nothing, and the title would read "Your Week -1 results".
 * - `isWeekFullyGraded` gates results detection ONLY. The AI half's gate is "an
 *   `ai_recaps` row exists", written by `sendAIRecaps` in the *grade* cron ~9h
 *   earlier — hoisting completeness to this function would silently take the recap
 *   push down with it. Same shape as the #793 note in `runPregameNotifications`.
 *
 * Delivery key is (user, group): each push carries that group's beat, and the first
 * also carries the user's cross-group record. A user with results due but no recap
 * row gets one results-only push on `(user, null)`. `results_recap` still logs once
 * with `group_id: null` — the tally aggregates across groups by design and its dedup
 * is keyed on kind + week + user, so a group-less row preserves that byte-for-byte.
 */
export async function sendWeeklyRecap(weekId: number): Promise<WeeklyRecapSummary> {
  const empty = (): WeeklyRecapSummary => ({
    results: { evaluated: 0, sent: 0, skipped: 0 },
    aiRecaps: { evaluated: 0, sent: 0, skipped: 0 },
    pushes: 0,
    delivered: 0
  });

  if (!(await isScoringWeek(weekId))) return empty();

  // One week-identity fetch for both concerns — the season year rides along for the
  // deep link (#818), so there is one week shape here rather than the two that drifted.
  const { data: weekRow, error: weekErr } = await supabaseService
    .from('weeks')
    .select('week_number, seasons!inner(year)')
    .eq('id', weekId)
    .maybeSingle();
  if (weekErr) throw weekErr;
  if (!weekRow) return empty();
  const seasonYear = (weekRow.seasons as { year: number }).year;
  const weekNumber = weekRow.week_number;

  const results: WeeklyRecapConcern = { evaluated: 0, sent: 0, skipped: 0 };
  const aiRecaps: WeeklyRecapConcern = { evaluated: 0, sent: 0, skipped: 0 };

  // ---- Results detection ----------------------------------------------------
  // Gated on completeness: a partly-graded week would report a record that is still
  // moving. Note this is the ONLY thing that gate covers — see the header.
  const tallies = new Map<string, RecapTally>();
  if (await isWeekFullyGraded(weekId)) {
    const { data: games, error: gamesErr } = await supabaseService
      .from('games')
      .select('id')
      .eq('week_id', weekId);
    if (gamesErr) throw gamesErr;
    const gameIds = (games ?? []).map((g) => g.id);

    // A week with no games has no settlements to report — but it must only skip
    // results detection, never abort the pass. As a whole-function early return
    // (which is what this was) it took the AI-recap half down with it.
    if (gameIds.length > 0) {
      const { data: allUsers, error: usersErr } = await supabaseService
        .from('users')
        .select('id, notification_prefs');
      if (usersErr) throw usersErr;
      const notifiable = (allUsers ?? [])
        .filter((u) => {
          const prefs = parseNotificationPrefs(u.notification_prefs);
          return prefs.enabled && prefs.results_recap;
        })
        .map((u) => u.id);

      if (notifiable.length > 0) {
        // Per-(user, week) dedup: skip anyone already recapped for this week — unless
        // that recap reached no device (#815), in which case the slot was never spent.
        const { data: logs, error: logsErr } = await supabaseService
          .from('notification_log')
          .select('user_id, detail')
          .eq('kind', 'results_recap')
          .eq('week_id', weekId)
          .in('user_id', notifiable);
        if (logsErr) throw logsErr;
        const recapped = new Set(
          (logs ?? []).filter((l) => holdsDedupSlot(l.detail)).map((l) => l.user_id)
        );

        // Aggregate each user's settlements across all groups for the week's games.
        const { data: settlements, error: setErr } = await supabaseService
          .from('pick_settlement')
          .select('user_id, outcome, points_delta')
          .in('game_id', gameIds)
          .in('user_id', notifiable);
        if (setErr) throw setErr;
        const byUser = new Map<string, RecapTally>();
        for (const s of settlements ?? []) {
          const t = byUser.get(s.user_id) ?? { wins: 0, losses: 0, pushes: 0, missed: 0, net: 0 };
          if (s.outcome === 'win') t.wins++;
          else if (s.outcome === 'loss') t.losses++;
          else if (s.outcome === 'push') t.pushes++;
          else if (s.outcome === 'missed') t.missed++;
          t.net += s.points_delta ?? 0;
          byUser.set(s.user_id, t);
        }

        for (const userId of notifiable) {
          results.evaluated++;
          const tally = byUser.get(userId);
          // Nothing to report (no settlements) or already recapped this week.
          if (!tally || recapped.has(userId)) {
            results.skipped++;
            continue;
          }
          tallies.set(userId, tally);
        }
      }
    }
  }

  // ---- AI-recap detection ---------------------------------------------------
  // The gate here is "generation already happened": whichever `ai_recaps` rows the
  // grade cron wrote for this week, hours earlier. A group with no row (recaps off,
  // or generation failed) is simply not evaluated.
  const recapsByUser = new Map<string, Array<{ groupId: string; prose: string }>>();
  const { data: recapRows, error: recapErr } = await supabaseService
    .from('ai_recaps')
    .select('group_id, prose')
    .eq('season_year', seasonYear)
    .eq('week_number', weekNumber);
  if (recapErr) throw recapErr;
  // One recap row per (group, season, week); keep each group's prose for the push body.
  const proseByGroup = new Map<string, string>();
  for (const r of recapRows ?? []) {
    if (!proseByGroup.has(r.group_id)) proseByGroup.set(r.group_id, r.prose);
  }
  const groupIds = [...proseByGroup.keys()];

  if (groupIds.length > 0) {
    const { data: memberships, error: memErr } = await supabaseService
      .from('group_memberships')
      .select('group_id, user_id')
      .in('group_id', groupIds)
      .eq('status', 'active');
    if (memErr) throw memErr;

    if (memberships && memberships.length > 0) {
      const prefsByUser = await loadPrefs([...new Set(memberships.map((m) => m.user_id))]);

      // Per-(user, group, week) dedup: skip anyone already pushed for this group/week —
      // unless that push reached no device (#815), which never spent the slot.
      const { data: logs, error: logsErr } = await supabaseService
        .from('notification_log')
        .select('user_id, group_id, detail')
        .eq('kind', 'ai_recap')
        .eq('week_id', weekId)
        .in('group_id', groupIds);
      if (logsErr) throw logsErr;
      const notified = new Set(
        (logs ?? [])
          .filter((l) => holdsDedupSlot(l.detail))
          .map((l) => `${l.user_id}:${l.group_id}`)
      );

      for (const { group_id, user_id } of memberships) {
        const prefs = prefsByUser.get(user_id);
        if (!prefs?.enabled || !prefs.ai_recap) continue;
        aiRecaps.evaluated++;

        if (notified.has(`${user_id}:${group_id}`)) {
          aiRecaps.skipped++;
          continue;
        }
        // Guards against a duplicate membership row re-pushing within this same run;
        // the cross-run decision is the holdsDedupSlot filter above.
        notified.add(`${user_id}:${group_id}`);

        const list = recapsByUser.get(user_id) ?? [];
        list.push({ groupId: group_id, prose: proseByGroup.get(group_id) ?? '' });
        recapsByUser.set(user_id, list);
      }
    }
  }

  // ---- Merged delivery ------------------------------------------------------
  let pushes = 0;
  let delivered = 0;
  const dueUsers = new Set([...tallies.keys(), ...recapsByUser.keys()]);

  for (const userId of dueUsers) {
    const tally = tallies.get(userId) ?? null;
    const groups = recapsByUser.get(userId) ?? [];
    // No recap row for this user anywhere: still one push, carrying results alone.
    const targets: Array<{ groupId: string | null; prose: string | null }> =
      groups.length > 0 ? groups : [{ groupId: null, prose: null }];

    for (const [index, target] of targets.entries()) {
      // The record is cross-group, so it rides the first push only — a two-league
      // user hears their week's record once, not once per league.
      const carriesResults = index === 0 && tally !== null;
      const content = weeklyRecapPushBody({
        weekNumber,
        tally: carriesResults ? tally : null,
        prose: target.prose
      });
      if (!content) continue;

      // The one place that knows whether this push reached a device — carried into
      // both the summary and every log row it writes, never discarded (#815).
      const result = await sendToUser(userId, {
        ...content,
        // The week-scoped landing surface is /week (#776), fully qualified (#818):
        // this cron fires Tuesday 14:00 UTC, 14 hours after week N+1 became active,
        // so a bare `/week` would open the empty next week rather than the one this
        // push reports on. /week is also the only route carrying BOTH halves of the
        // merged body — the same hardware /recap shows, plus the personal breakdown
        // /recap has never rendered.
        url: `/week?season=${seasonYear}&week=${weekNumber}`,
        // Group-scoped so two leagues' pushes don't replace each other in the tray:
        // push-handler.js sets `renotify` whenever a tag is present (#814), and a
        // shared tag would leave one buzz and one surviving notification.
        tag: `weekly-recap-${target.groupId ?? 'you'}-week-${weekId}`
      });
      pushes++;
      delivered += result.sent;

      // Per-concern log rows against the one delivery: dedup stays independent, so a
      // failed merged push releases both slots and the next tick re-sends only what
      // is still missing.
      if (target.groupId) {
        await logNotification({
          user_id: userId,
          kind: 'ai_recap',
          week_id: weekId,
          group_id: target.groupId,
          delivery: result
        });
        aiRecaps.sent++;
      }
      if (carriesResults) {
        await logNotification({
          user_id: userId,
          kind: 'results_recap',
          week_id: weekId,
          detail: {
            wins: tally.wins,
            losses: tally.losses,
            pushes: tally.pushes,
            missed: tally.missed,
            net: tally.net
          },
          delivery: result
        });
        results.sent++;
      }
    }
  }

  return { results, aiRecaps, pushes, delivered };
}

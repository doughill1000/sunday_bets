// src/lib/server/oddsSync.ts
import { fetchNFLSpreadsForWeek, extractFanduelSpread } from './odds';
import { findActiveWeek } from './db/queries/findActiveWeek';
import { findUpcomingWeek } from './db/queries/findUpcomingWeek';
import { findTeamsByNames } from './db/queries/findTeamsByNames';
import { attachLineToMatchup } from './db/commands/attachLineToMatchup';
import { setActiveLine } from './db/commands/setActiveLine';
import { supabaseService } from '$lib/supabase/service';
import { canSyncNow } from './settings';
import type {
  SyncError,
  SyncStats,
  WeekSyncCounts,
  WeekSyncResult,
  WeekSyncRole
} from '$lib/types/server/odds';

const CAP_REACHED = 'Odds API monthly call cap reached';

// The columns a sync needs off a `weeks` row.
type SyncableWeek = { id: number; week_number: number; start_ts: string; end_ts: string };

const NO_COUNTS: WeekSyncCounts = {
  count: 0,
  totalGames: 0,
  processed: 0,
  unchanged: 0,
  skippedNoTeams: 0,
  skippedNoSpread: 0,
  skippedNoMatchup: 0
};

/**
 * Fetch one week's spreads and attach them to that week's seeded matchups.
 *
 * The whole week window is handed to `fetchNFLSpreadsForWeek`, which derives the
 * sport key from *this* week's `weekNumber` — so a run spanning the
 * preseason→regular boundary (week -4 active, week 1 upcoming) hits the
 * preseason endpoint for one and the regular-season endpoint for the other.
 */
async function syncOddsForWeek(week: SyncableWeek, source: string): Promise<WeekSyncCounts> {
  const games = await fetchNFLSpreadsForWeek({
    id: week.id,
    startTs: week.start_ts,
    endTs: week.end_ts,
    weekNumber: week.week_number
  });

  const teamNames = Array.from(new Set(games.flatMap((g) => [g.home_team, g.away_team])));
  const teamsAll = await findTeamsByNames(teamNames);
  const byName = new Map(teamsAll.map((t) => [t.name, { id: t.id, name: t.name }]));

  let inserted = 0;
  let processed = 0;
  let unchanged = 0;
  let skippedNoTeams = 0;
  let skippedNoSpread = 0;
  let skippedNoMatchup = 0;

  // Process sequentially; easy to read and keeps DB load tame.
  for (const g of games) {
    const home = byName.get(g.home_team);
    const away = byName.get(g.away_team);
    if (!home || !away) {
      skippedNoTeams++;
      continue;
    }

    const spread = extractFanduelSpread(g);
    if (!spread) {
      skippedNoSpread++;
      continue;
    }

    // Find the schedule-seeded game and attach external_game_id.
    // Returns null when schedule sync hasn't created the matchup yet.
    const gameId = await attachLineToMatchup({
      weekId: week.id,
      homeTeamId: home.id,
      awayTeamId: away.id,
      externalGameId: g.id
    });

    if (!gameId) {
      skippedNoMatchup++;
      continue;
    }

    const spreadTeamId = spread.spreadTeamName === home.name ? home.id : away.id;

    // Skip no-op writes: if the active line already matches (team+value), do nothing.
    const { data: active, error: activeErr } = await supabaseService
      .from('game_lines')
      .select('id, spread_team_id, spread_value')
      .eq('game_id', gameId)
      .eq('source', source)
      .eq('is_active_line', true)
      .maybeSingle();

    if (activeErr) throw activeErr;

    if (
      active &&
      active.spread_team_id === spreadTeamId &&
      Number(active.spread_value) === Number(spread.spreadValue)
    ) {
      unchanged++;
      processed++;
      continue;
    }

    await setActiveLine({
      gameId,
      spreadTeamId,
      spreadValue: spread.spreadValue,
      source
    });

    inserted++;
    processed++;
  }

  return {
    count: inserted,
    totalGames: games.length,
    processed,
    unchanged,
    skippedNoTeams,
    skippedNoSpread,
    skippedNoMatchup
  };
}

function synced(role: WeekSyncRole, week: SyncableWeek, counts: WeekSyncCounts): WeekSyncResult {
  return { role, ok: true, weekId: week.id, weekNumber: week.week_number, ...counts };
}

function notSynced(role: WeekSyncRole, week: SyncableWeek | null, reason: string): WeekSyncResult {
  return {
    role,
    ok: false,
    weekId: week?.id ?? null,
    weekNumber: week?.week_number ?? null,
    reason
  };
}

function totals(weeks: WeekSyncResult[]): WeekSyncCounts {
  return weeks.reduce<WeekSyncCounts>(
    (sum, w) =>
      w.ok
        ? {
            count: sum.count + w.count,
            totalGames: sum.totalGames + w.totalGames,
            processed: sum.processed + w.processed,
            unchanged: sum.unchanged + w.unchanged,
            skippedNoTeams: sum.skippedNoTeams + w.skippedNoTeams,
            skippedNoSpread: sum.skippedNoSpread + w.skippedNoSpread,
            skippedNoMatchup: sum.skippedNoMatchup + w.skippedNoMatchup
          }
        : sum,
    { ...NO_COUNTS }
  );
}

/**
 * Prime the next week's slate. Best-effort by design: the active week's work is
 * already done and committed by the time this runs, and the active week is the
 * one players are looking at — so every failure here is reported as this week's
 * own result rather than thrown.
 */
async function primeUpcomingWeek(source: string): Promise<WeekSyncResult[]> {
  // Held outside the try so a failed sync still names the week it was for; it is
  // null only when resolving the week itself is what failed.
  let upcoming: SyncableWeek | null = null;
  try {
    upcoming = await findUpcomingWeek();
    if (!upcoming) return [];

    // Re-check the cap between the two fetches: the active week may have spent
    // the last call, and stopping cleanly here beats a half-written second week.
    if (!(await canSyncNow())) return [notSynced('upcoming', upcoming, CAP_REACHED)];

    return [synced('upcoming', upcoming, await syncOddsForWeek(upcoming, source))];
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'Upcoming-week sync failed';
    return [notSynced('upcoming', upcoming, reason)];
  }
}

async function runSync(source: string, includeUpcoming: boolean): Promise<SyncStats | SyncError> {
  if (!(await canSyncNow())) {
    return { ok: false, reason: CAP_REACHED };
  }

  const active = await findActiveWeek();
  if (!active) return { ok: false, reason: 'No active week' };

  // A fault on the active week still throws: that slate is live in the UI, so its
  // failure is a genuine incident (500 + Sentry via withCronLog), not a skip.
  const weeks: WeekSyncResult[] = [synced('active', active, await syncOddsForWeek(active, source))];

  if (includeUpcoming) weeks.push(...(await primeUpcomingWeek(source)));

  return { ok: true, ...totals(weeks), weeks };
}

/**
 * Sync the active week only.
 *
 * The hourly `pregame` cron uses this: it fires within hours of kickoff to keep
 * the live slate fresh and to feed line-shift alerts, so spending a second API
 * call every hour on a slate days out would buy nothing.
 */
export function syncOddsForActiveWeek(source = 'fanduel'): Promise<SyncStats | SyncError> {
  return runSync(source, false);
}

/**
 * Sync the active week and prime the next upcoming one (#801).
 *
 * A week used to be able to acquire lines only *after* it was already the active
 * week, so every newly-active slate rendered as all "No line" until the next
 * `sync-odds` cron landed — a ~14h hole every Tuesday, wider still whenever
 * GitHub's scheduler drifted or a run failed. Priming the upcoming week days
 * ahead means a slate is lined before players ever see it, and takes cron timing
 * out of the picture. One extra request per run against a 1000/month cap.
 */
export function syncOddsForActiveAndUpcomingWeeks(
  source = 'fanduel'
): Promise<SyncStats | SyncError> {
  return runSync(source, true);
}

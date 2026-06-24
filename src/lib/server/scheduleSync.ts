import * as Sentry from '@sentry/sveltekit';
import {
  fetchEspnWeek,
  EspnFetchError,
  EspnParseError,
  NFL_REGULAR_SEASON_WEEKS
} from './schedule';
import { findTeamsByExternalKeys } from './db/queries/findTeamsByExternalKeys';
import { upsertSeasonByYear } from './db/commands/upsertSeasonByYear';
import { upsertWeek } from './db/commands/upsertWeek';
import { upsertGameByMatchup } from './db/commands/upsertGameByMatchup';

export type ScheduleSyncStats = {
  ok: true;
  year: number;
  weeksProcessed: number;
  gamesUpserted: number;
  gamesSkipped: number;
  weeksFailed: number;
};

export type ScheduleSyncError = {
  ok: false;
  reason: string;
};

// Derive the NFL year to sync when not explicitly specified.
// Jan–Aug: upcoming season (current calendar year).
// Sep–Dec: current season (current calendar year).
export function targetNFLYear(): number {
  return new Date().getFullYear();
}

export async function syncSchedule(
  year: number = targetNFLYear()
): Promise<ScheduleSyncStats | ScheduleSyncError> {
  const seasonId = await upsertSeasonByYear(year);

  const teams = await findTeamsByExternalKeys();
  const byAbbr = new Map(teams.map((t) => [t.external_key, t.id]));

  let weeksProcessed = 0;
  let gamesUpserted = 0;
  let gamesSkipped = 0;
  let weeksFailed = 0;

  for (let weekNum = 1; weekNum <= NFL_REGULAR_SEASON_WEEKS; weekNum++) {
    let weekResult;
    try {
      weekResult = await fetchEspnWeek(year, weekNum);
    } catch (err) {
      if (err instanceof EspnFetchError || err instanceof EspnParseError) {
        Sentry.captureException(err);
        weeksFailed++;
        continue;
      }
      throw err;
    }

    if (weekResult.games.length === 0) {
      // Week returned no games yet (future week not yet scheduled by ESPN).
      continue;
    }

    // Derive week window from actual game kickoff times.
    const timestamps = weekResult.games.map((g) => new Date(g.date).getTime());
    const startTs = new Date(Math.min(...timestamps)).toISOString();
    // +4 h so findActiveWeek() keeps the week "open" through the last game.
    const endTs = new Date(Math.max(...timestamps) + 4 * 60 * 60 * 1000).toISOString();

    const weekId = await upsertWeek({ seasonId, weekNumber: weekNum, startTs, endTs });
    weeksProcessed++;

    for (const game of weekResult.games) {
      const homeTeamId = byAbbr.get(game.homeTeamAbbr);
      const awayTeamId = byAbbr.get(game.awayTeamAbbr);

      if (!homeTeamId || !awayTeamId) {
        gamesSkipped++;
        continue;
      }

      await upsertGameByMatchup({
        weekId,
        homeTeamId,
        awayTeamId,
        commenceTime: game.date,
        scheduleGameId: game.scheduleGameId,
        status: game.status
      });
      gamesUpserted++;
    }
  }

  return {
    ok: true,
    year,
    weeksProcessed,
    gamesUpserted,
    gamesSkipped,
    weeksFailed
  };
}

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

// Derive the NFL year to sync when not explicitly specified.
// Jan–Feb: playoffs still running for the prior calendar year's season.
// Mar–Aug: offseason; sync targets the upcoming season.
// Sep–Dec: regular season in progress.
export function targetNFLYear(): number {
  const now = new Date();
  const month = now.getUTCMonth() + 1; // 1-12
  return month <= 2 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
}

// Derive gapless Tuesday-to-Tuesday week windows from a set of kickoff timestamps.
// Matches the historical import convention so findActiveWeek() is always satisfied
// from Tuesday pre-game through the following Monday night.
function weekBoundaries(timestamps: number[]): { startTs: string; endTs: string } {
  const earliest = Math.min(...timestamps);
  const latest = Math.max(...timestamps);

  // Snap back to the most recent Tuesday 00:00 UTC.
  const startDate = new Date(earliest);
  const startDay = startDate.getUTCDay(); // 0=Sun … 6=Sat
  startDate.setUTCDate(startDate.getUTCDate() - ((startDay - 2 + 7) % 7));
  startDate.setUTCHours(0, 0, 0, 0);

  // Snap forward to the next Tuesday 00:00 UTC after last game ends (~+4 h).
  const endDate = new Date(latest + 4 * 60 * 60 * 1000);
  const endDay = endDate.getUTCDay();
  endDate.setUTCDate(endDate.getUTCDate() + ((2 - endDay + 7) % 7 || 7));
  endDate.setUTCHours(0, 0, 0, 0);

  return { startTs: startDate.toISOString(), endTs: endDate.toISOString() };
}

export async function syncSchedule(year: number = targetNFLYear()): Promise<ScheduleSyncStats> {
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

    const timestamps = weekResult.games.map((g) => new Date(g.date).getTime());
    const { startTs, endTs } = weekBoundaries(timestamps);

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

import { dbClient } from '$lib/server/db';
import {
  games,
  weeks,
  teams,
  gameLines
} from '../../../../db/schema';
import { and, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

export async function listGamesWithActiveLine(weekId: number | string) {
  const away = alias(teams, 'away_team');
  const home = alias(teams, 'home_team');

  return dbClient
    .select({
      gameId: games.id,
      commenceTime: games.commenceTime,
      status: games.status,
      homeTeamId: games.homeTeamId,
      awayTeamId: games.awayTeamId,
      homeName: home.name,
      homeShort: home.shortName,
      awayName: away.name,
      awayShort: away.shortName,
      spreadTeamId: gameLines.spreadTeamId,
      spreadValue: gameLines.spreadValue,
      fetchedAt: gameLines.fetchedAt
    })
    .from(games)
    .innerJoin(weeks, eq(weeks.id, games.weekId))
    .innerJoin(home, eq(home.id, games.homeTeamId))
    .innerJoin(away, eq(away.id, games.awayTeamId))
    .leftJoin(
      gameLines,
      and(
        eq(gameLines.gameId, games.id),
        eq(gameLines.isActiveLine, true),
        eq(gameLines.source, 'fanduel')
      )
    )
    .where(eq(games.weekId, Number(weekId)))
    .orderBy(games.commenceTime)
    .execute();
}
import { dbClient } from '$lib/server/db/dbClient';
import * as schema from '../../../../db/schema';
import { eq, count } from 'drizzle-orm';

const { picks, games } = schema;

export async function getWeekPickCounts(weekId: number) {
  return dbClient
    .select({
      gameId: picks.gameId,
      pickCount: count()
    })
    .from(picks)
    .innerJoin(games, eq(games.id, picks.gameId))
    .where(eq(games.weekId, weekId))
    .groupBy(picks.gameId);
}
import { dbClient } from '$lib/server/db';
import { picks, users } from '../../../../db/schema';
import { inArray, eq } from 'drizzle-orm';

export async function findPicksForGames(gameIds: (number | string)[]) {
  if (!gameIds.length) return [];
  const stringGameIds = gameIds.map(id => String(id));
  return dbClient
    .select({
      gameId: picks.gameId,
      userId: picks.userId,
      displayName: users.displayName,
      finalLockedAt: picks.finalLockedAt,
      initialLockedAt: picks.initialLockedAt,
      finalLockedSpreadTeamId: picks.finalLockedSpreadTeamId,
      initialLockedSpreadTeamId: picks.initialLockedSpreadTeamId,
      finalLockedSpreadValue: picks.finalLockedSpreadValue,
      initialLockedSpreadValue: picks.initialLockedSpreadValue,
      weight: picks.weight
    })
    .from(picks)
    .innerJoin(users, eq(users.id, picks.userId))
    .where(inArray(picks.gameId, stringGameIds))
    .execute();
}
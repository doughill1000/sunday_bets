import { games as gamesTable } from '../../../../db/schema';
import { and, eq } from 'drizzle-orm';
import type { OddsGame, TeamRow } from '$lib/types/server';
import type { DbOrTx } from '../types';

export async function upsertGame(
  tx: DbOrTx,
  g: OddsGame,
  home: TeamRow,
  away: TeamRow,
  weekId: number
) {
  let gameRow = await tx
    .insert(gamesTable)
    .values({
      weekId,
      externalGameId: g.id,
      commenceTime: g.commence_time,
      homeTeamId: home.id,
      awayTeamId: away.id,
      status: 'scheduled',
    })
    .onConflictDoUpdate({
      target: [gamesTable.externalGameId, gamesTable.weekId],
      set: {
        commenceTime: g.commence_time,
        homeTeamId: home.id,
        awayTeamId: away.id,
        status: 'scheduled',
      }
    })
    .returning()
    .then(rows => rows[0]);

  if (!gameRow) {
    gameRow = await tx
      .select()
      .from(gamesTable)
      .where(
        and(
          eq(gamesTable.externalGameId, g.id),
          eq(gamesTable.weekId, weekId)
        )
      )
      .then(rows => rows[0]);
  }
  return gameRow;
}
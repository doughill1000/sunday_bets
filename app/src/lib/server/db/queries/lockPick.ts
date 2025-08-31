import { dbClient } from '$lib/server/db/dbClient';
import * as schema from '../../../../db/schema';
import type { TeamSide, WeightCode } from '$lib/types/domain';

const { picks } = schema;

export async function lockPick(userId: string, gameId: string, team: TeamSide, weight: WeightCode) {
  await dbClient
    .insert(picks)
    .values({
      userId,
      gameId,
      pickedTeamId: team === 'home' ? /* homeTeamId */ 0 : /* awayTeamId */ 0, // You need to resolve team IDs
      weight,
      initialLockedAt: new Date().toISOString(),
      relockUsed: false,
    })
    .onConflictDoUpdate({
      target: [picks.userId, picks.gameId],
      set: {
        pickedTeamId: team === 'home' ? /* homeTeamId */ 0 : /* awayTeamId */ 0,
        weight,
        finalLockedAt: new Date().toISOString(),
        relockUsed: true,
      }
    })
    .execute();
  return { ok: true };
}
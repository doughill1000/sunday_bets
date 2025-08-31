import { dbClient } from '$lib/server/db/dbClient';
import * as schema from '../../../../db/schema';
import { eq, and } from 'drizzle-orm';

const { picks } = schema;

export async function unlockPick(userId: string, gameId: string) {
  const result = await dbClient
    .select()
    .from(picks)
    .where(and(eq(picks.userId, userId), eq(picks.gameId, gameId)))
    .limit(1)
    .execute();
  const row = result[0];
  if (!row || row.relockUsed) return { ok: false, reason: 'Unlock limit reached.' };

  await dbClient
    .update(picks)
    .set({
      finalLockedAt: null,
      finalLockedSpreadTeamId: null,
      finalLockedSpreadValue: null,
      relockUsed: true,
    })
    .where(and(eq(picks.userId, userId), eq(picks.gameId, gameId)))
    .execute();

  return { ok: true };
}
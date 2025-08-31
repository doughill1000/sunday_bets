import { dbClient } from '$lib/server/db/dbClient';
import * as schema from '../../../../db/schema';
import { eq, and } from 'drizzle-orm';
import type { PickEntry, TeamSide, WeightCode } from '$lib/types/domain';

const { picks } = schema;

export async function getEntry(userId: string, gameId: string): Promise<PickEntry> {
  const result = await dbClient
    .select()
    .from(picks)
    .where(and(eq(picks.userId, userId), eq(picks.gameId, gameId)))
    .limit(1)
    .execute();
  const row = result[0];
  if (!row) return {};
  return {
    lockedPick: row.finalLockedSpreadTeamId
      ? { team: row.finalLockedSpreadTeamId === row.pickedTeamId ? 'home' : 'away', weight: row.weight }
      : undefined,
    lockedAt: row.finalLockedAt ?? row.initialLockedAt ?? undefined,
    unlocksUsed: row.relockUsed ? 1 : 0,
  };
}
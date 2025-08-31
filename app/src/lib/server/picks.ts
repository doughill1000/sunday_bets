// src/lib/server/picks.ts
import { dbClient } from './db/dbClient';
import * as schema from '../../db/schema';
import { eq, count, and } from 'drizzle-orm';
import type { TeamSide, WeightCode } from '$lib/types/domain';
import type { PickEntry } from '$lib/types/server';
import { createSupabaseService } from '$lib/supabase/service';
import { getWeekPickCounts } from './db/queries/getWeekPickCounts';
import { getEntry } from './db/queries/getEntry';
import { lockPick } from './db/queries/lockPick';
import { unlockPick } from './db/queries/unlockPick';
import { isLocked } from './db/queries/isLocked';

const supabase = createSupabaseService();

export async function getMyPicks(userId: string, weekId: string) {
  const { data, error } = await supabase
    .from('picks_view')
    .select('*')
    .eq('user_id', userId)
    .eq('week_id', weekId);
  if (error) throw error;
  return data;
}

export async function lockPick(
    gameId: string,
    pickedTeamId: string,
    weight: WeightCode
) {
  const { data, error } = await supabase.rpc('lock_pick', {
    gameId,
    pickedTeamId,
    weight
  });
  if (error) throw error;
  return data;
}

const { picks, games } = schema;

// Lock a pick for a user/game
export async function lockPickDb(userId: string, gameId: string, team: TeamSide, weight: WeightCode) {
  // You may want to check for ace usage, kickoff, etc. here
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

// Unlock a pick for a user/game
export async function unlockPickDb(userId: string, gameId: string) {
  // Only allow unlock if relockUsed < 1
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

// Check if a pick is locked
export async function isLockedDb(userId: string, gameId: string): Promise<boolean> {
  const entry = await getEntry(userId, gameId);
  return !!entry.lockedPick;
}

// Check if kickoff has passed
export function kickoffPassed(kickoffISO: string): boolean {
  const t = new Date(kickoffISO).getTime();
  return isFinite(t) && Date.now() >= t;
}

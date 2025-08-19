// src/lib/server/picks.ts
import type { RequestEvent } from '@sveltejs/kit';
import { db } from './db';
import * as schema from '../../db/schema';
import { eq, count } from 'drizzle-orm';

export async function getMyPicks(event: RequestEvent, weekId: string) {
  const { data, error } = await event.locals.supabase
    .from('picks_view')
    .select('*')
    .eq('week_id', weekId);
  if (error) throw error;
  return data;
}

export async function lockPick(
  event: RequestEvent,
  args: {
    game_id: string;
    picked_team_id: string;
    weight: 'L' | 'M' | 'H' | 'A';
  }
) {
  // Use an RPC that enforces window + one-time relock rule atomically
  const { data, error } = await event.locals.supabase.rpc('lock_pick', args);
  if (error) throw error;
  return data;
}

const { picks, games } = schema;

export async function getWeekPickCounts(weekId: number) {
  return db
    .select({
      gameId: picks.gameId,
      pickCount: count()
    })
    .from(picks)
    .innerJoin(games, eq(games.id, picks.gameId))
    .where(eq(games.weekId, weekId))
    .groupBy(picks.gameId);
}

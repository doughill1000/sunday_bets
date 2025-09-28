import type { RequestEvent } from '@sveltejs/kit';
import { findUserPickForGame } from './db/queries/findUserPickForGame';

export async function isLocked(event: RequestEvent, gameId: string): Promise<boolean> {
  const entry = await findUserPickForGame(event, gameId);
  return !!entry?.locked_at;
}

export function kickoffPassed(kickoffISO: string): boolean {
  const t = new Date(kickoffISO).getTime();
  return isFinite(t) && Date.now() >= t;
}

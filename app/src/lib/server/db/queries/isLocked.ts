import { findUserPickForGame } from './findUserPickForGame';

import type { RequestEvent } from '@sveltejs/kit';

export async function isLocked(event: RequestEvent, gameId: string): Promise<boolean> {
  const entry = await findUserPickForGame(event, gameId);
  return !!entry?.final_locked_at;
}

import { getEntry } from './getEntry';

export async function isLocked(userId: string, gameId: string): Promise<boolean> {
  const entry = await getEntry(userId, gameId);
  return !!entry.lockedPick;
}
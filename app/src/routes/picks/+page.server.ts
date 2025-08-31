import { getMyPicks } from '$lib/server/db';
import { findActiveWeek } from '$lib/server/db';

export async function load(event) {
  const week = await findActiveWeek();
  if (!week) return { picks: {}, week: null };

  const data = await getMyPicks(event, week.id);
  const picks: Record<string, any> = {};
  for (const row of data) {
    picks[row.game_id] = {
      lockedPick: row.lockedPick,
      lockedAt: row.lockedAt,
      unlocksUsed: row.unlocksUsed,
    };
  }

  return { picks, week };
}

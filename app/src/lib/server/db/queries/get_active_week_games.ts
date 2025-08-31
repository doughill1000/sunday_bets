import { dbClient } from '$lib/server/db';
import {weeks} from '$lib/server/db';
import { getGamesWithActiveLines } from './get_games_with_active_lines';
import { desc, eq, and, lt, gte, lte } from 'drizzle-orm';

export async function getActiveWeekGames() {
  const now = new Date().toISOString();

  let week = await dbClient
    .select({ id: weeks.id })
    .from(weeks)
    .where(and(
      lte(weeks.startTs, now),
      lt(weeks.endTs, now)
    ))
    .orderBy(desc(weeks.startTs))
    .limit(1);

  if (!week.length) {
    // Fallback: most recent week that has started
    week = await dbClient
      .select({ id: weeks.id })
      .from(weeks)
      .where(lte(weeks.startTs, now))
      .orderBy(desc(weeks.startTs))
      .limit(1);
  }

  if (!week.length) return [];

  return getGamesWithActiveLines(week[0].id);
}
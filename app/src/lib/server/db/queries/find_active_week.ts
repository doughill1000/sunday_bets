// src/lib/server/oddsSync.ts
import { dbClient } from '$lib/server/db/dbClient';
import { weeks } from '../../../../db/schema';
import { desc, eq, and, lte, gte } from 'drizzle-orm';

export async function findActiveWeek() {
  const now = new Date().toISOString();
  const result = await dbClient
    .select()
    .from(weeks)
    .where(
      and(
        lte(weeks.startTs, now),
        gte(weeks.endTs, now)
      )
    )
    .orderBy(desc(weeks.startTs))
    .limit(1)
    .execute();
  return result[0] ?? null;
}

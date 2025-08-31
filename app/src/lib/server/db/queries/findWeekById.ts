import { dbClient } from '$lib/server/db';
import { weeks } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

export async function findWeekById(weekId: number | string) {
  return dbClient.query.weeks.findFirst({ where: eq(weeks.id, Number(weekId)) });
}
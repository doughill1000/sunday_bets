import { dbClient } from '$lib/server/db';
import { teams } from '../../../../db/schema';
import { inArray } from 'drizzle-orm';

export async function findTeamsByNames(names: string[]) {
  return dbClient
    .select({
      id: teams.id,
      name: teams.name,
      short_name: teams.shortName,
    })
    .from(teams)
    .where(inArray(teams.name, names))
    .execute();
}
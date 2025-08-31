import { dbClient } from '$lib/server/db/dbClient';
import { settings } from '../../../../db/schema'; // adjust path if needed

export async function getSettings() {
  const result = await dbClient
    .select()
    .from(settings)
    .limit(1)
    .execute();
  return result[0] ?? {};
}
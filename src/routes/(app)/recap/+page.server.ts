import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getRecentRecaps } from '$lib/server/db/queries/recaps';
import { getCurrentSeasonYear } from '$lib/server/db/queries/leaderboard';

export const load: PageServerLoad = async ({ locals }) => {
  const { groupId } = locals;
  if (!groupId) throw redirect(303, '/auth/error?reason=no-group');

  const seasonYear = await getCurrentSeasonYear();
  const recaps = await getRecentRecaps(groupId, seasonYear, 5);

  return { recaps };
};

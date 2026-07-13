import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getRecentRecaps } from '$lib/server/db/queries/recaps';
import { getCurrentSeasonYear } from '$lib/server/db/queries/leaderboard';
import { getSeasonWeeklyAwards } from '$lib/server/readModels/weeklyAwards';

export const load: PageServerLoad = async ({ locals }) => {
  const { groupId } = locals;
  if (!groupId) throw redirect(303, '/auth/error?reason=no-group');

  const seasonYear = await getCurrentSeasonYear();
  const [recaps, weeklyAwards] = await Promise.all([
    getRecentRecaps(groupId, seasonYear, 6),
    getSeasonWeeklyAwards(groupId, seasonYear)
  ]);

  return { recaps, weeklyAwards, currentUserId: locals.user?.id ?? null };
};

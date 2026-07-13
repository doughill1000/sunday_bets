import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// The shareable Recap payload (recent prose + weekly hardware/shelf) now comes from the
// client `createQuery` keyed by `(groupId, season)` so a revisit renders from cache and
// revalidates in the background (ADR-0033, issue #602). `+page.ts` prefetches it on the
// server for a flash-free first paint. This load stays light — just the season + viewer
// metadata needed to build the query key and personalize the "(you)" labels.
export const load: PageServerLoad = async ({ locals }) => {
  const { groupId } = locals;
  if (!groupId) throw redirect(303, '/join');

  const seasonYear = await locals.getCurrentSeasonYear();

  return { groupId, seasonYear, currentUserId: locals.user?.id ?? null };
};

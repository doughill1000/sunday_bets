import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getWrappedSeasons, getSeasonWrapped } from '$lib/server/db/queries/seasonWrapped';
import { resolveSeasonYear } from '$lib/server/seasonDefault';
import { tracePageLoad } from '$lib/server/observability';

export const load: PageServerLoad = async (event) => {
  const { groupId } = event.locals;
  if (!groupId) throw redirect(303, '/join');
  return tracePageLoad('wrapped', () => loadWrapped(event, groupId));
};

async function loadWrapped(event: Parameters<PageServerLoad>[0], groupId: string) {
  const currentUserId = event.locals.user?.id ?? null;

  // availableSeasons = seasons that actually have a generated Wrapped (picker source);
  // the current (in-progress) season usually has none yet, so the default lands on the
  // newest completed Wrapped via resolveSeasonYear.
  const [currentSeasonYear, availableSeasons] = await Promise.all([
    event.locals.getCurrentSeasonYear(),
    getWrappedSeasons(groupId)
  ]);

  const seasonYear = resolveSeasonYear(
    event.url.searchParams.get('season'),
    availableSeasons,
    currentSeasonYear
  );

  const { league, player } = await getSeasonWrapped(groupId, seasonYear, currentUserId);

  return {
    groupId,
    currentUserId,
    seasonYear,
    availableSeasons,
    league,
    player
  };
}

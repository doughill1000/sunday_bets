import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAvailableSeasons } from '$lib/server/db/queries/leaderboard';
import { isSeasonInProgress } from '$lib/server/db/queries/seasonProgress';
import { resolveSeasonYear } from '$lib/server/seasonDefault';

// The shareable Recap payload (recent prose + weekly hardware/shelf) now comes from the
// client `createQuery` keyed by `(groupId, season)` so a revisit renders from cache and
// revalidates in the background (ADR-0033, issue #602). `+page.ts` prefetches it on the
// server for a flash-free first paint. This load stays light — just the season + viewer
// metadata needed to build the query key and personalize the "(you)" labels.
//
// #739: the anchor is `resolveSeasonYear` (last season with results in the off-season, the
// live season once it grades), NOT `getCurrentSeasonYear()` — which is the *calendar* season
// and renders an empty archive for the seven off-season months while last season's full
// SeasonShelf + hardware + recaps sit unreachable. `?season=` browses history; a minimal
// season select (below) makes past seasons reachable. This is the SAME derivation `/league`
// uses, so the shared `['recap', groupId, season]` cache key resolves identically on both
// surfaces and they can never disagree about a week's awards (#631).
export const load: PageServerLoad = async ({ locals, url }) => {
  const { groupId } = locals;
  if (!groupId) throw redirect(303, '/join');

  const seasonParam = url.searchParams.get('season');
  const [currentSeasonYear, availableSeasons] = await Promise.all([
    locals.getCurrentSeasonYear(),
    getAvailableSeasons(groupId)
  ]);

  const seasonYear = resolveSeasonYear(seasonParam, availableSeasons, currentSeasonYear);

  // The season select pins "This season · YYYY" only while the newest season is actually in
  // progress (a real weeks-based signal, mirroring `/stats` and `/league`), so a concluded
  // season folds into the plain Past-seasons list rather than misleadingly still reading
  // "This season" in the off-season (#638). Checked against the newest known year so a
  // brand-new season is evaluated correctly even before it has standings.
  const latestSeasonInProgress = await isSeasonInProgress(
    Math.max(seasonYear, currentSeasonYear, ...availableSeasons)
  );

  return {
    groupId,
    seasonYear,
    availableSeasons,
    latestSeasonInProgress,
    currentUserId: locals.user?.id ?? null
  };
};

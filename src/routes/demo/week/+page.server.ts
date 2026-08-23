// Demo Week (#776, #833): the demo mirror of the promoted /week destination, reading only the
// committed snapshot (#460, ADR-0026). Lifted from the Week tab the demo League page carried
// while the real page kept Week inside /league (#741).
//
// Since #832 made kickoff the boundary between the picking board and the live board, the sweat
// belongs here rather than on `/demo` — so the frozen mid-Sunday (#585) is served on this page.
// Everything below is derived from the already-committed `liveWeek`: no new snapshot field, and
// no live query (ADR-0026 §4 — the demo issues zero per-visitor ESPN calls).
import type { PageServerLoad } from './$types';
import { getDemoSnapshot } from '$lib/server/demo/snapshot';
import { demoLiveScores, demoWeeklyBreakdown } from '$lib/server/demo/liveWeek';
import { orderWeeklyBreakdown } from '$lib/utils/weeklyPicks';

export const load: PageServerLoad = () => {
  const snapshot = getDemoSnapshot();
  const { liveWeek, persona, honors } = snapshot;

  const liveScores = demoLiveScores(liveWeek.games);
  // Games in play lead the board, exactly as the real /week orders them (#831). On the real page
  // the scores handed to this are gated to the live window; the frozen scores are that gate here,
  // since a snapshot has no window to fall out of.
  const breakdown = orderWeeklyBreakdown(
    demoWeeklyBreakdown(liveWeek.games, honors.members, persona.userId),
    liveScores
  );

  return {
    persona,
    completedSeasonYear: snapshot.meta.completedSeasonYear,
    weeklyAwards: snapshot.weeklyAwards,
    liveWeekNumber: liveWeek.weekNumber,
    standings: liveWeek.standings,
    breakdown,
    liveScores
  };
};

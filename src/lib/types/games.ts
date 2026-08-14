import type { WeightCode } from './domain';

/** Game shape rendered by the picks UI. */
export type PickGame = {
  id: string;
  kickoff: string;
  home: string;
  away: string;
  homeTeamId: number | null;
  awayTeamId: number | null;
  spreadTeamId: number | null;
  spreadValue: number | null;
  /**
   * The graded final score, or `null` while the game is unplayed or ungraded (#832).
   *
   * Grading is the ONLY writer of `games.final_scores` (`$lib/server/grading.ts`) — schedule
   * sync never touches it — so a non-null value means "the grade cron has settled this game",
   * not "someone recorded a running score". That makes it the same `isFinal = scores != null`
   * signal `$lib/utils/weeklyPicks.ts` already uses on the Weekly tab; don't invent a second
   * convention. It is what lets the `/picks` handoff strip separate "in play" from "final"
   * with no live feed at all. Optional because the pre-kickoff projections that reuse this
   * shape (e.g. the All-In declaration RPC) neither need nor select it.
   */
  finalScores?: { home: number; away: number } | null;
};

/** Game response returned by the week-games endpoint. */
export type WeekGame = {
  id: string;
  commenceTime: string;
  status: string;
  home: { id: number; name: string; shortName: string };
  away: { id: number; name: string; shortName: string };
  line: {
    spreadTeamId: number | null;
    spreadValue: number | null;
    source: string | null;
    fetchedAt: string | null;
  };
  started: boolean;
  picks: Array<{
    userId: string;
    displayName: string;
    pickedTeamId: number | null;
    weight: WeightCode | null;
    lockedAt: string | null;
    isMe: boolean;
  }>;
};

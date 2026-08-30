// Client-safe payload for the weekly-hardware surface (issue #387). The award shapes are
// single-sourced from the pure domain module; this file only adds the season-level wrapper
// the recap route loads and the query cache keys on.
export type {
  WeeklyAward,
  WeeklyAwardId,
  WeeklyAwardHolder,
  WeeklyHardware
} from '$lib/domain/weeklyAwards';

import type { WeeklyHardware } from '$lib/domain/weeklyAwards';

/**
 * Every fully-graded scoring week's hardware, newest first. Carried a season-long `shelf`
 * of award tallies until #866 cut it — see `weeklyAwards.ts` for why.
 */
export type SeasonWeeklyAwards = {
  season_year: number;
  weeks: WeeklyHardware[];
};

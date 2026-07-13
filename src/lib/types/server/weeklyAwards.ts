// Client-safe payload for the weekly-hardware surface (issue #387). The award/shelf
// shapes are single-sourced from the pure domain module; this file only adds the
// season-level wrapper the recap route loads and the query cache keys on.
export type {
  WeeklyAward,
  WeeklyAwardId,
  WeeklyAwardHolder,
  WeeklyHardware,
  ShelfAward,
  SeasonShelfEntry
} from '$lib/domain/weeklyAwards';

import type { WeeklyHardware, SeasonShelfEntry } from '$lib/domain/weeklyAwards';

/** Every fully-graded scoring week's hardware (newest first) plus the season-long shelf. */
export type SeasonWeeklyAwards = {
  season_year: number;
  weeks: WeeklyHardware[];
  shelf: SeasonShelfEntry[];
};

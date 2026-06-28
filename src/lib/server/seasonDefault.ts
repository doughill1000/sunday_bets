/**
 * Resolve which season the leaderboard / stats / group pages should display.
 *
 * Precedence:
 *  1. An explicit, parseable `?season=` query param — lets users browse history.
 *  2. The most recent season the group actually has standings for.
 *  3. The active season year — last resort for a group with no standings at all.
 *
 * Why not just use the active season (`max(year)` in `seasons`, via
 * getCurrentSeasonYear)? The admin Schedule Sync seeds the *upcoming* season's games
 * the moment ESPN publishes them, which bumps the active season year before a single
 * game is graded. Defaulting to it then surfaced empty "No standings / No settled
 * picks" rows for a season that hasn't started. We instead stay on the last season
 * with real results until the new season produces standings — at which point it
 * becomes the newest entry in `availableSeasons` and is selected automatically.
 *
 * Pure and order-independent (`availableSeasons` need not be pre-sorted).
 */
export function resolveSeasonYear(
  rawSeason: string | null,
  availableSeasons: number[],
  currentSeasonYear: number
): number {
  if (rawSeason) {
    const parsed = parseInt(rawSeason, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return availableSeasons.length > 0 ? Math.max(...availableSeasons) : currentSeasonYear;
}

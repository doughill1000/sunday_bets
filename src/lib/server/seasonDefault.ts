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
  const explicit = parseSeasonParam(rawSeason);
  if (explicit !== null) return explicit;
  return availableSeasons.length > 0 ? Math.max(...availableSeasons) : currentSeasonYear;
}

/**
 * The season anchor for a "what's happening now" surface — today only `/week` (#824).
 *
 * Same precedence as `resolveSeasonYear`, with one step inserted: an explicit `?season=` still
 * wins, then the season that is actually **in play** (`findStartedSeasonYear()` — the season of
 * the most recently started week), and only then the browse-history default above.
 *
 * Why /week needs its own rule: `resolveSeasonYear` answers "which season should I *browse*",
 * and it answers it from `availableSeasons`, which is derived from the leaderboard matview. Per
 * ADR-0016 boundary 1 every aggregation filters `where w.is_scoring`, so a preseason round
 * contributes no rows and its season never enters that list — leaving /week pointed at last
 * January while the round people are actually playing sits one hand-edited URL away. Anchoring
 * on a *started week* instead of on graded standings sidesteps that entirely, and can never
 * land on an empty tab: the anchor week is itself one of `getSeasonWeekOptions`' rows.
 *
 * This is deliberately NOT folded into `resolveSeasonYear`. Its six other callers (/league,
 * /stats, /market, /recap, /wrapped, /league/manage) are browse surfaces that must keep the
 * empty-summer guard — flipping them to the live season would blank standings, stats and
 * recaps for the ~3.5 weeks between the first preseason kickoff and the first graded week.
 *
 * Pure; `startedSeasonYear` is `null` when no week has ever started.
 */
export function resolveLiveSeasonYear(
  rawSeason: string | null,
  startedSeasonYear: number | null,
  availableSeasons: number[],
  currentSeasonYear: number
): number {
  const explicit = parseSeasonParam(rawSeason);
  if (explicit !== null) return explicit;
  if (startedSeasonYear !== null) return startedSeasonYear;
  return resolveSeasonYear(null, availableSeasons, currentSeasonYear);
}

/** An explicit `?season=`, or null when absent/unparseable. */
function parseSeasonParam(rawSeason: string | null): number | null {
  if (!rawSeason) return null;
  const parsed = parseInt(rawSeason, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

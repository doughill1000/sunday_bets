// "Slice by" navigation model for the merged /league surface (issue #529).
//
// /league used to split one against-the-spread dataset across two tabs — Teams (by team) and
// Trends (by situation) — each with its own time control that didn't sync. This module models
// the merged control: one chip row where "By team" is simply the first way to slice the league,
// sitting beside the situational cuts. Kept pure and out of the component so the slice set and
// its resolution are unit-testable without a DOM.
import type { MarketBendCuts } from '$lib/utils/leagueBends';

/** One lens on the league ATS dataset: the by-team roster, or a situational cut. */
export type LeagueSlice =
  'teams' | 'favorites' | 'spread' | 'quadrants' | 'primetime' | 'divisional';

/** Chip labels — compact so the row scrolls cleanly at 390px. */
export const LEAGUE_SLICE_LABEL: Record<LeagueSlice, string> = {
  teams: 'By team',
  favorites: 'Favorites',
  spread: 'Spread',
  quadrants: 'Quadrants',
  primetime: 'Primetime',
  divisional: 'Divisional'
};

/** Canonical order: "By team" leads, then the situational cuts in reading order. */
export const LEAGUE_SLICE_ORDER: LeagueSlice[] = [
  'teams',
  'favorites',
  'spread',
  'quadrants',
  'primetime',
  'divisional'
];

/** The situational cuts, plus the fav/dog games count that gates the "Favorites" slice — the
 *  subset of the /league (or pooled) payload the slice availability reads. */
export type SituationalSliceCuts = MarketBendCuts & { favDog: { games: number } };

/**
 * Which situational cuts have data for the active scope — a chip renders only for a cut with
 * something to show, so an empty season or a thin pooled window never offers a dead slice. The
 * predicate per cut matches what its detail panel needs to render a non-empty view.
 */
export function availableSituationalSlices(cuts: SituationalSliceCuts): LeagueSlice[] {
  return LEAGUE_SLICE_ORDER.filter((slice) => {
    switch (slice) {
      case 'teams':
        return false; // handled by availableLeagueSlices — always offered, scope-gated at render
      case 'favorites':
        return cuts.favDog.games > 0;
      case 'spread':
        return cuts.spreadBuckets.length > 0;
      case 'quadrants':
        return cuts.quadrants.length > 0;
      case 'primetime':
        return cuts.primetime.length > 0;
      case 'divisional':
        return cuts.divisional.some((d) => d.games > 0);
    }
  });
}

/**
 * The full slice set for the chip row: "By team" always leads (it is season-scoped and nudges
 * under the pooled window rather than disappearing, so the lens is never lost), then whichever
 * situational cuts have data.
 */
export function availableLeagueSlices(cuts: SituationalSliceCuts): LeagueSlice[] {
  return ['teams', ...availableSituationalSlices(cuts)];
}

/**
 * The effective slice: the user's pick when it is still available, otherwise the first slice
 * (always "By team"). Lets the component keep the selection in plain `$state` and fall back
 * purely by derivation when a cut vanishes on a scope switch — no reset `$effect` needed.
 */
export function resolveLeagueSlice(
  selected: LeagueSlice | null,
  available: LeagueSlice[]
): LeagueSlice {
  return selected && available.includes(selected) ? selected : (available[0] ?? 'teams');
}

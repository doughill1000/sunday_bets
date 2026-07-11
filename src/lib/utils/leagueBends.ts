// "Where the market bends" synthesis transform for the /league Trends tab (issue #517).
//
// The Trends tab answers one question — which situations deviate most from a 50/50 coin
// flip against the spread? — so the tab leads with a single diverging chart instead of six
// stacked cards. This module turns the already-aggregated situational cuts (spread size,
// home/road favorites, primetime, divisional) into a ranked list of favorite-cover deviations
// from 50%, so the chart component stays a dumb renderer. Kept pure and out of the component
// so the ranking is unit-testable without a DOM.
//
// Framing note (honest by construction): every row is a *favorite* cover rate, and the two
// favorite quadrants (home/road) already capture the full home/road structure — the underdog
// quadrants are their exact mirror (home-dog cover% = 100 − road-fav cover% over the same
// games), so including them would double-count the same deviation. Likewise the daytime and
// non-divisional buckets are the league baseline the notable cuts are read against, so they
// are not candidates. Cover math always flows through the shared `coverPct` helper.
import type {
  LeagueDivisionalSplit,
  LeaguePrimetimeSlot,
  LeagueQuadrant,
  LeagueSpreadBucket
} from '$lib/types/server/league';
import { coverPct, LEAGUE_THIN_SAMPLE } from '$lib/utils/leagueAts';

/** One situational cut's favorite-cover deviation from a 50% baseline, for the diverging chart. */
export type MarketBend = {
  /** Stable identifier (unique per row), for keyed rendering. */
  key: string;
  /** Human label, e.g. "Road favorites", "Big favs (7–9.5)". */
  label: string;
  /** Favorite cover fraction in (0, 1) — always non-null (thin/undecided cuts are dropped). */
  coverPct: number;
  /** Signed deviation from the coin flip: coverPct − 0.5 (positive = favorites covering). */
  deviation: number;
  /** Sample size n (total games in the cut, pushes included). */
  games: number;
  /** Which side the deviation favors: 'fav' when ≥ 50% covers, 'dog' when underdogs do. */
  side: 'fav' | 'dog';
};

/** The situational cuts the synthesis reads — a subset of the /league (or pooled) payload. */
export type MarketBendCuts = {
  spreadBuckets: LeagueSpreadBucket[];
  quadrants: LeagueQuadrant[];
  primetime: LeaguePrimetimeSlot[];
  divisional: LeagueDivisionalSplit[];
};

/** Default rows shown in the diverging chart — enough to tell the story, few enough to scan. */
export const BENDS_LIMIT = 6;

/** Readable spread-bucket labels for the synthesis (the market cut, not the raw view key). */
const SPREAD_BUCKET_LABEL: Record<string, string> = {
  '1-3': 'Small favs (1–3)',
  '3.5-6.5': 'Mid favs (3.5–6.5)',
  '7-9.5': 'Big favs (7–9.5)',
  '10+': 'Huge favs (10+)'
};

type Candidate = { key: string; label: string; wins: number; losses: number; games: number };

/** Build the (unfiltered, unranked) candidate cuts from the payload. */
function candidates(cuts: MarketBendCuts): Candidate[] {
  const out: Candidate[] = [];

  // Spread size — every non-pick'em bucket is an independent cut (pick'em has no favorite).
  for (const b of cuts.spreadBuckets) {
    if (b.bucketOrder === 0) continue;
    out.push({
      key: `spread-${b.bucket}`,
      label: SPREAD_BUCKET_LABEL[b.bucket] ?? `Favs (${b.bucket})`,
      wins: b.favoriteCovers,
      losses: b.underdogCovers,
      games: b.games
    });
  }

  // Home vs road favorites — the two favorite quadrants capture the whole structure.
  for (const q of cuts.quadrants.filter((c) => c.isFavorite)) {
    out.push({
      key: `quadrant-${q.isHome ? 'home' : 'road'}-fav`,
      label: q.isHome ? 'Home favorites' : 'Road favorites',
      wins: q.ats.wins,
      losses: q.ats.losses,
      games: q.games
    });
  }

  // Primetime — the night windows pooled into one cut, read against the daytime baseline.
  const night = cuts.primetime.filter((s) => s.slot !== 'day');
  if (night.length > 0) {
    out.push({
      key: 'primetime-night',
      label: 'Primetime favs',
      wins: night.reduce((s, r) => s + r.favoriteCovers, 0),
      losses: night.reduce((s, r) => s + r.underdogCovers, 0),
      games: night.reduce((s, r) => s + r.games, 0)
    });
  }

  // Divisional matchups — read against the non-divisional baseline.
  const div = cuts.divisional.find((d) => d.isDivisional);
  if (div) {
    out.push({
      key: 'divisional',
      label: 'Divisional favs',
      wins: div.favoriteCovers,
      losses: div.underdogCovers,
      games: div.games
    });
  }

  return out;
}

/**
 * Rank the situational cuts by how far their favorite cover rate bends from a 50% coin flip,
 * most-notable first. Cuts with no decided games or fewer than `minSample` total games are
 * dropped as too noisy to rank (they remain reachable via the tab's chip detail panels). Ties
 * break toward the larger sample, then label, for a stable order. Returns at most `limit` rows.
 */
export function topMarketBends(
  cuts: MarketBendCuts,
  opts: { minSample?: number; limit?: number } = {}
): MarketBend[] {
  const minSample = opts.minSample ?? LEAGUE_THIN_SAMPLE;
  const limit = opts.limit ?? BENDS_LIMIT;

  const rows: MarketBend[] = [];
  for (const c of candidates(cuts)) {
    if (c.games < minSample) continue;
    const cover = coverPct({ wins: c.wins, losses: c.losses });
    if (cover == null) continue; // no decided games — nothing to plot
    const deviation = cover - 0.5;
    rows.push({
      key: c.key,
      label: c.label,
      coverPct: cover,
      deviation,
      games: c.games,
      side: deviation >= 0 ? 'fav' : 'dog'
    });
  }

  rows.sort(
    (a, b) =>
      Math.abs(b.deviation) - Math.abs(a.deviation) ||
      b.games - a.games ||
      a.label.localeCompare(b.label)
  );
  return rows.slice(0, limit);
}

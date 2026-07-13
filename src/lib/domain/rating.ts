// Cross-season credibility rating — shared, client-safe presentation layer (issue #361,
// ADR-0032). This module owns the constants and pure display helpers that BOTH the server
// fold ($lib/server/rating/computeRatings.ts, which imports RATING_PAR / MIN_QUALIFIED_DECISIONS
// from here so the qualification gate has one source) and the client surfaces (the /stats Career
// hero, a future /league ladder) agree on.
//
// The rating math itself — the sequential ELO-style fold — lives server-side in
// $lib/server/rating/. Here we keep only what a browser may safely see: the 1500 par line, the
// qualification threshold, the qualitative tier banding, the meter mapping, and the ranking.
//
// Semantics are fixed by ADR-0032 ("beat the closing line, weighted by conviction"); the numeric
// constants below are the tuned-in-#361 knobs the ADR leaves open and can be retuned without a new
// ADR if they read unfairly in practice.

/** Market par on the ELO-comparable scale. A rating of 1500 means "even with the closing line";
 *  higher beats the spread over time, lower trails it. Shared with the server fold's start value. */
export const RATING_PAR = 1500;

/** Settled career decisions required before a rating is shown at all (ADR-0032 §5,
 *  "hidden until qualified"). Below this a player is Unrated with an explicit "N to go" — never a
 *  provisional number on a noisy sample. Shared with the server fold's qualification gate. */
export const MIN_QUALIFIED_DECISIONS = 20;

/** Half-width of the meter window, in rating points: RATING_PAR ± this maps to the meter's 0–100%.
 *  1500 sits at the midpoint; 1650 fills it, 1350 empties it. Presentation only. */
const METER_HALF_WINDOW = 150;

/** Qualitative credibility tiers, sharp→square. A deterministic banding of the numeric rating
 *  (ADR-0032 §"Surfacing"): betting vocabulary that makes the number legible at a glance. */
export type RatingTier = 'square' | 'solid' | 'sharp' | 'shark';

/** Lower bound (inclusive) of each tier on the rating scale, tuned in #361 within ADR bounds.
 *  Chosen so par (~50% cover) reads Solid, a sustained ~57%+ reads Sharp, ~64%+ reads Shark, and
 *  anything below the market reads Square — reconciling with the design study's illustrative
 *  1533 Solid / 1554 Sharp / 1602 Shark. */
const TIER_MIN: Record<Exclude<RatingTier, 'square'>, number> = {
  solid: 1500,
  sharp: 1540,
  shark: 1580
};

const TIER_LABELS: Record<RatingTier, string> = {
  square: 'Square',
  solid: 'Solid',
  sharp: 'Sharp',
  shark: 'Shark'
};

/** Band a numeric rating into its qualitative tier. Pure and total over the number line. */
export function ratingTier(rating: number): RatingTier {
  if (rating >= TIER_MIN.shark) return 'shark';
  if (rating >= TIER_MIN.sharp) return 'sharp';
  if (rating >= TIER_MIN.solid) return 'solid';
  return 'square';
}

/** The short display word for a tier ("Sharp", "Shark", …). */
export function tierLabel(tier: RatingTier): string {
  return TIER_LABELS[tier];
}

/** Map a rating to the credibility meter's fill percentage (0–100), clamped. 1500 → 50%.
 *  A pure presentation transform; the meter is a legibility aid, not a second number. */
export function meterPct(rating: number): number {
  const raw = 50 + ((rating - RATING_PAR) / METER_HALF_WINDOW) * 50;
  return Math.max(0, Math.min(100, raw));
}

/** One player's rating as read from the `player_ratings` model. `rating`/`seasonDelta` are null
 *  for an Unrated (sub-threshold) player; `decisions` and `decisionsToQualify` drive the "N to go"
 *  progress in that state. Mirrors the persisted read model (ADR-0032 §8). */
export type PlayerRatingEntry = {
  user_id: string;
  /** Credibility rating on the 1500 scale, or null while Unrated. */
  rating: number | null;
  /** Settled career spread decisions counted into the rating (missed excluded, ADR-0032 §3). */
  decisions: number;
  /** Settled decisions still needed to qualify; 0 once rated. */
  decisionsToQualify: number;
  /** Movement during the current (latest) season after its soft reset — the "this season" arrow.
   *  Null while Unrated. */
  seasonDelta: number | null;
};

/**
 * Dense rank (1-based) of a qualified player among the group's other qualified players, by rating
 * descending — the "#N in league" the Career hero shows. Ties share a rank. Returns null for an
 * Unrated player (no rank until qualified) or when the id is absent. Pure over the entry list.
 */
export function ratingRank(entries: PlayerRatingEntry[], userId: string): number | null {
  const target = entries.find((e) => e.user_id === userId);
  if (!target || target.rating == null) return null;

  const higher = new Set<number>();
  for (const e of entries) {
    if (e.rating != null && e.rating > target.rating) higher.add(e.rating);
  }
  return higher.size + 1;
}

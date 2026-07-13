// Cross-season credibility rating — shared, client-safe presentation layer (issue #361,
// ADR-0032 v2). This module owns the constants and pure display helpers that BOTH the server
// fold ($lib/server/rating/computeRatings.ts, which imports RATING_PAR / MIN_QUALIFIED_DECISIONS
// from here so the qualification gate has one source) and the client surfaces (the /stats Career
// hero, a future /league ladder) agree on.
//
// The rating math itself — an order-independent, conviction-flat, shrunk career cover-rate mapped
// onto the 1500/ELO scale — lives server-side in $lib/server/rating/. Here we keep only what a
// browser may safely see: the 1500 par line, the qualification threshold, the qualitative tier
// banding, the meter mapping, and the ranking.
//
// Semantics are fixed by ADR-0032 (beat the spread you actually locked your pick against, every
// decision weighted the same regardless of conviction); the numeric constants below are the
// tuned-in-#361 knobs the ADR leaves open and can be retuned without a new ADR if they read
// unfairly in practice.

/** Market par on the ELO-comparable scale. A rating of 1500 means even with the market — the
 *  spread a player actually locked their pick against; higher beats it over time, lower trails it.
 *  Shared with the server fold's shrinkage-prior center. */
export const RATING_PAR = 1500;

/** Settled career decisions required before a rating is shown at all (ADR-0032 §5,
 *  "hidden until qualified"). Below this a player is Unrated with an explicit "N to go" — never a
 *  provisional number on a noisy sample. Shared with the server fold's qualification gate. */
export const MIN_QUALIFIED_DECISIONS = 20;

/** Half-width of the meter window, in rating points: RATING_PAR ± this maps to the meter's 0–100%.
 *  1500 sits at the midpoint; 1550 fills it, 1450 empties it. Presentation only. Tightened from the
 *  v1 window (±150) to ±50 in v2: the honest v2 spread is only ~±35 points (conviction-flat
 *  shrinkage pulls much harder toward par than the old sequential fold did), so a ±150 window left
 *  the meter barely moving; ±50 makes it read meaningfully across the real range of ratings. */
const METER_HALF_WINDOW = 50;

/** Qualitative credibility tiers, sharp→square. A deterministic banding of the numeric rating
 *  (ADR-0032 §"Surfacing"): betting vocabulary that makes the number legible at a glance. */
export type RatingTier = 'square' | 'solid' | 'sharp' | 'shark';

/** Lower bound (inclusive) of each tier on the rating scale, tuned in #361 and recalibrated for
 *  the v2 scale. Chosen so par (~50% cover) reads Solid, a sustained ~51.5%+ cover rate reads
 *  Sharp, ~53.3%+ reads Shark, and anything below the market reads Square. */
const TIER_MIN: Record<Exclude<RatingTier, 'square'>, number> = {
  solid: 1500,
  sharp: 1508,
  shark: 1520
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
  /** How much the current (latest) season's decisions moved the career rating — the "this season"
   *  arrow. Null while Unrated, or when every settled decision is from a single season. */
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

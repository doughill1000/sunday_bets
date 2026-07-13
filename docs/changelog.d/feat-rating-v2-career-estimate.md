- **#361** Credibility rating v2 — the cross-season "who knows ball" rating is now an
  order-independent, conviction-flat career cover-rate (shrunk toward market par, on the
  1500 scale) graded against the line a player locked at pick time, replacing the
  sequential conviction-weighted ELO. Removes an order/recency bias and conviction
  weighting that production data showed was anti-informative; qualitative tiers recentered.
  files: `src/lib/server/rating/computeRatings.ts` · `src/lib/domain/rating.ts` ·
  ADR-0032 (amended)

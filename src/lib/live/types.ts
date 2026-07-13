// Shared payload shapes for the live sweat board (#386), defined outside `$lib/server/*` so
// both the server pass-through and the client poll can import them without pulling server
// code into the browser bundle.

export type LiveScoreEntry = {
  homeScore: number;
  awayScore: number;
  /** Only the two live-relevant statuses reach the client; scheduled/postponed never do. */
  status: 'in_progress' | 'final';
  /** Live game clock ("12:47"), present only while in progress. */
  displayClock: string | null;
  /** Quarter/period, present only while in progress. */
  period: number | null;
};

export type LiveScoresPayload = {
  /** Keyed by OUR game id, so the client joins straight to its loaded games. */
  scores: Record<string, LiveScoreEntry>;
  /**
   * ISO timestamp of the last real ESPN fetch, or `null` when nothing is live / a degraded
   * fetch. Reports the honest data age even when the browser reads a CDN-cached response.
   */
  fetchedAt: string | null;
};

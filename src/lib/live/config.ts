// Shared, isomorphic timing constants for the live Sunday sweat board (issue #386).
// Imported by BOTH the server passthrough (`$lib/server/liveScores.ts`, which self-gates
// its ESPN fetch to the live window) and the client poll (`PicksBoard`, which gates
// `enabled`/freshness on the same window). Keep it dependency-free so it stays safe to
// import from either side — it must never pull in `$lib/server/*`.

/**
 * How long after kickoff a game is still considered "live" for board purposes — it
 * covers a ~3.5h game plus overtime plus a short tail of `Final — unofficial` before the
 * grade cron runs. Past this window a game ages out of the board entirely, so the graded
 * result (shown on the standings surfaces) supersedes the unofficial live one and the
 * server stops hitting ESPN for it. Display-only; grading/settlement are untouched.
 */
export const LIVE_WINDOW_MS = 6 * 60 * 60 * 1000; // 6h

/**
 * Client poll cadence during a live window. ~25s reads as real-time while staying well
 * clear of hammering ESPN (see issue #386's cadence research: the NFL scoreboard's
 * `max-age=1` CDN TTL means there's no cache wall, but ~15s+ is the goodwill floor). The
 * short shared server cache (`LIVE_CACHE_TTL_MS` / `s-maxage`) collapses all concurrent
 * viewers to ≤1 ESPN fetch per window regardless of headcount.
 */
export const LIVE_POLL_MS = 25_000; // 25s

/**
 * When the board's data is older than this, it stops asserting a live number and flips to
 * "Stale · reconnecting" rather than passing a frozen value off as current. Sized to a
 * couple of missed polls (or ESPN erroring / a backgrounded tab that just resumed).
 * Measured against the honest `fetchedAt` the endpoint reports — when it last actually hit
 * ESPN — not when the browser received the (possibly CDN-cached) response.
 */
export const STALE_THRESHOLD_MS = 90_000; // 90s

/**
 * A game is inside its live window when kickoff has passed but is within `LIVE_WINDOW_MS`.
 * Shared by the server gate (skip the ESPN fetch when nothing is live) and the client gate
 * (pause polling when nothing is live). `kickoffMs` is epoch ms; `now` defaults to now.
 */
export function isWithinLiveWindow(kickoffMs: number, now: number = Date.now()): boolean {
  return kickoffMs <= now && now < kickoffMs + LIVE_WINDOW_MS;
}

// Stable identity so a board re-deriving on the 1s tick doesn't hand children a fresh
// object every second once the window has closed.
const NO_SCORES: Record<string, never> = {};

/**
 * The live scores a board may actually render: the polled payload while a game is inside its
 * window, nothing once every game has aged out.
 *
 * Gate the derived VALUE, not just the fetch. `enabled: false` stops TanStack from *fetching*
 * but does not drop the cached payload — `gcTime` only starts counting once the query loses
 * its last observer, and a mounted component is an observer. A board that reads
 * `query.data.scores` directly therefore keeps rendering the final poll indefinitely: a frozen
 * mid-game score, still lit `LIVE` with a dead clock. `refetchOnWindowFocus` respects
 * `enabled` too, so reopening a backgrounded PWA never corrects it, and the `liveStale` guard
 * can't catch it either — that guard is itself gated on the window being active, so it is off
 * at exactly the moment the number becomes permanently frozen (#822).
 *
 * Outside the window, hand children nothing and let them fall back to their static/graded
 * presentation — the graded result is the authority there anyway (`$lib/server/liveScores.ts`
 * "yields to graded"). Callers in frozen/read-only mode (ADR-0026 `/demo`) bypass this
 * entirely: a frozen board has no live window and no poll to go stale.
 */
export function activeLiveScores<T>(
  scores: Record<string, T>,
  windowActive: boolean
): Record<string, T> {
  return windowActive ? scores : NO_SCORES;
}

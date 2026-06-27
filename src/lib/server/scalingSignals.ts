// src/lib/server/scalingSignals.ts
//
// Pure helpers that turn raw cron_run_log rows into the operator-facing
// "scaling signal" the roadmap's measured-scale guardrail depends on: how close
// the notification cron runs to the Vercel function timeout (issue #190). Kept
// dependency-free so it is trivially unit-testable.
import type { CronRunRow } from '$lib/server/db/queries/getRecentCronRuns';

// Vercel function execution timeout, in seconds. No `maxDuration` is configured
// in vercel.json, so the platform default applies. Update this if a function
// `maxDuration` is later set. See docs/observability/scaling-signals.md.
export const VERCEL_FUNCTION_TIMEOUT_SECONDS = 300;

// The notification (pick-reminder) path runs inside the `pregame` cron job
// (src/routes/(app)/api/cron/pregame/+server.ts → sendPickReminders), so the
// pregame run duration is the hard Tier-B trigger source.
export const NOTIFICATION_CRON_JOB = 'pregame';

// Tier-B trigger: if a notification run consumes this fraction of the timeout,
// move the reminder fan-out off the request path (queue / background job).
export const CRON_HEADROOM_WARN_FRACTION = 0.5;

export type CronHeadroom = {
  job: string;
  timeoutSeconds: number;
  /** Duration of the most recent finished run, or null if none finished. */
  latestDurationSeconds: number | null;
  /** Worst (longest) finished run in the sample, or null if none finished. */
  maxDurationSeconds: number | null;
  /** Number of finished runs the figures are computed from. */
  sampleCount: number;
  /** Remaining fraction of the timeout at the worst run (1 = idle, 0 = at limit). */
  headroomPct: number | null;
  /** True when headroom has fallen to/under the warn threshold. */
  warn: boolean;
};

function durationSeconds(run: Pick<CronRunRow, 'started_at' | 'finished_at'>): number | null {
  if (!run.finished_at) return null;
  const ms = new Date(run.finished_at).getTime() - new Date(run.started_at).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return ms / 1000;
}

/**
 * Summarize how close a cron `job`'s recent runs come to `timeoutSeconds`.
 * Only finished runs (with a `finished_at`) contribute. Newest-first input is
 * assumed for `latestDurationSeconds` (matches getRecentCronRuns ordering).
 */
export function computeCronHeadroom(
  runs: readonly CronRunRow[],
  job: string = NOTIFICATION_CRON_JOB,
  timeoutSeconds: number = VERCEL_FUNCTION_TIMEOUT_SECONDS
): CronHeadroom {
  const durations = runs
    .filter((r) => r.job === job)
    .map((r) => ({ run: r, secs: durationSeconds(r) }))
    .filter((d): d is { run: CronRunRow; secs: number } => d.secs !== null);

  if (durations.length === 0) {
    return {
      job,
      timeoutSeconds,
      latestDurationSeconds: null,
      maxDurationSeconds: null,
      sampleCount: 0,
      headroomPct: null,
      warn: false
    };
  }

  const latestDurationSeconds = durations[0].secs;
  const maxDurationSeconds = Math.max(...durations.map((d) => d.secs));
  const headroomPct = timeoutSeconds > 0 ? Math.max(0, 1 - maxDurationSeconds / timeoutSeconds) : 0;

  return {
    job,
    timeoutSeconds,
    latestDurationSeconds,
    maxDurationSeconds,
    sampleCount: durations.length,
    headroomPct,
    warn: headroomPct <= 1 - CRON_HEADROOM_WARN_FRACTION
  };
}

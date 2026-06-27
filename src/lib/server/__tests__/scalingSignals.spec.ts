import { describe, it, expect } from 'vitest';
import {
  computeCronHeadroom,
  VERCEL_FUNCTION_TIMEOUT_SECONDS,
  NOTIFICATION_CRON_JOB
} from '$lib/server/scalingSignals';
import type { CronRunRow } from '$lib/server/db/queries/getRecentCronRuns';

function run(
  job: string,
  startedAt: string,
  durationSeconds: number | null,
  overrides: Partial<CronRunRow> = {}
): CronRunRow {
  const started = new Date(startedAt);
  const finished_at =
    durationSeconds === null
      ? null
      : new Date(started.getTime() + durationSeconds * 1000).toISOString();
  return {
    id: Math.floor(Math.random() * 1e6),
    job,
    started_at: started.toISOString(),
    finished_at,
    ok: durationSeconds === null ? null : true,
    summary: null,
    error: null,
    ...overrides
  };
}

describe('computeCronHeadroom', () => {
  it('returns an empty (non-warning) summary when there are no matching runs', () => {
    const result = computeCronHeadroom([], NOTIFICATION_CRON_JOB);
    expect(result.sampleCount).toBe(0);
    expect(result.latestDurationSeconds).toBeNull();
    expect(result.maxDurationSeconds).toBeNull();
    expect(result.headroomPct).toBeNull();
    expect(result.warn).toBe(false);
    expect(result.timeoutSeconds).toBe(VERCEL_FUNCTION_TIMEOUT_SECONDS);
  });

  it('ignores other jobs and unfinished runs', () => {
    const runs: CronRunRow[] = [
      run('grade', '2026-09-01T12:00:00Z', 10),
      run(NOTIFICATION_CRON_JOB, '2026-09-01T13:00:00Z', null), // still running
      run(NOTIFICATION_CRON_JOB, '2026-09-01T11:00:00Z', 30)
    ];
    const result = computeCronHeadroom(runs);
    expect(result.sampleCount).toBe(1);
    expect(result.maxDurationSeconds).toBe(30);
  });

  it('takes the latest from newest-first ordering and the max across the sample', () => {
    const runs: CronRunRow[] = [
      run(NOTIFICATION_CRON_JOB, '2026-09-03T10:00:00Z', 20), // newest → latest
      run(NOTIFICATION_CRON_JOB, '2026-09-02T10:00:00Z', 90), // worst
      run(NOTIFICATION_CRON_JOB, '2026-09-01T10:00:00Z', 45)
    ];
    const result = computeCronHeadroom(runs, NOTIFICATION_CRON_JOB, 300);
    expect(result.latestDurationSeconds).toBe(20);
    expect(result.maxDurationSeconds).toBe(90);
    expect(result.sampleCount).toBe(3);
    expect(result.headroomPct).toBeCloseTo(1 - 90 / 300, 5);
    expect(result.warn).toBe(false);
  });

  it('warns when the worst run consumes at least half the timeout', () => {
    const runs = [run(NOTIFICATION_CRON_JOB, '2026-09-02T10:00:00Z', 150)];
    const result = computeCronHeadroom(runs, NOTIFICATION_CRON_JOB, 300);
    expect(result.headroomPct).toBeCloseTo(0.5, 5);
    expect(result.warn).toBe(true);
  });

  it('clamps headroom to zero when a run exceeds the timeout', () => {
    const runs = [run(NOTIFICATION_CRON_JOB, '2026-09-02T10:00:00Z', 360)];
    const result = computeCronHeadroom(runs, NOTIFICATION_CRON_JOB, 300);
    expect(result.headroomPct).toBe(0);
    expect(result.warn).toBe(true);
  });

  it('drops rows with a negative or non-finite duration', () => {
    const bad = run(NOTIFICATION_CRON_JOB, '2026-09-02T10:00:00Z', 10);
    // finished before it started
    bad.finished_at = '2026-09-02T09:59:00Z';
    const result = computeCronHeadroom([bad]);
    expect(result.sampleCount).toBe(0);
  });
});

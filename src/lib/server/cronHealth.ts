// src/lib/server/cronHealth.ts
//
// Pure, dependency-free logic for the free cron missed-run watchdog (issue #206).
// The seven GitHub Actions crons each write a success row to cron_run_log; this
// module decides, per job, whether a scheduled run is *overdue* — the most recent
// expected fire time has passed (by more than a grace margin) without a
// successful run landing after it. Being schedule-aware (not just "age of last
// run") lets it flag a missed weekly/monthly run within the margin of its
// scheduled time, matching what Sentry Cron Monitors would do — for $0.
//
// Kept pure so it is trivially unit-testable, mirroring scalingSignals.ts. The
// endpoint (src/routes/api/health/+server.ts) wires it to live data. See
// docs/observability/health-watchdog.md.

export type CronScheduleKind = 'hourly' | 'weekly' | 'monthly';

export type CronSchedule = {
  /** cron_run_log job name. */
  job: string;
  kind: CronScheduleKind;
  /** UTC minute of the hour the job fires at. */
  minute: number;
  /** UTC hour (0-23). Ignored for 'hourly'. */
  hour?: number;
  /** UTC weekdays (0=Sun .. 6=Sat) the job fires on. Used by 'weekly'. */
  weekdays?: number[];
  /** UTC day-of-month the job fires on. Used by 'monthly'. */
  dayOfMonth?: number;
  /**
   * Grace period after the expected fire time before flagging a miss, in
   * minutes. Deliberately generous: GitHub Actions scheduled runs are commonly
   * delayed 10-30 min under load, so tight margins would false-positive. A truly
   * missed run (disabled workflow, outage) is hours/days late, so a generous
   * margin only delays a real alert by that margin — it never hides a real miss.
   */
  marginMinutes: number;
};

// The seven production crons and their GitHub Actions schedules (UTC), mirroring
// .github/workflows and issue #206. `grade` fires on six triggers across the week; the
// Tue 09:00 backstop is the representative one (it still fires every week regardless of
// the other game-night runs, so it's the right floor for "did grade run at all this
// week"). Margins are generous by design (see marginMinutes above) — they are NOT the
// tight Sentry check-in margins from the retired plan, because external polling +
// GitHub scheduler jitter needs slack.
export const CRON_SCHEDULES: readonly CronSchedule[] = [
  { job: 'pregame', kind: 'hourly', minute: 0, marginMinutes: 45 },
  {
    job: 'sync-odds',
    kind: 'weekly',
    weekdays: [2, 3, 4, 5, 6],
    hour: 14,
    minute: 0,
    marginMinutes: 60
  },
  { job: 'grade', kind: 'weekly', weekdays: [2], hour: 9, minute: 0, marginMinutes: 60 },
  { job: 'rollover-week', kind: 'weekly', weekdays: [2], hour: 10, minute: 0, marginMinutes: 60 },
  { job: 'sync-schedule', kind: 'weekly', weekdays: [2], hour: 15, minute: 0, marginMinutes: 60 },
  {
    job: 'weekly-recap',
    kind: 'weekly',
    weekdays: [2],
    hour: 14,
    minute: 0,
    marginMinutes: 60
  },
  {
    job: 'reset-odds-usage',
    kind: 'monthly',
    dayOfMonth: 1,
    hour: 0,
    minute: 5,
    marginMinutes: 180
  }
];

// Fraction of the monthly Odds API cap at which to surface a "near cap" warning
// (informational — does not degrade status; only hitting the cap does).
export const ODDS_NEAR_CAP_FRACTION = 0.9;

/**
 * The most recent instant at which `schedule` was expected to fire, at or before
 * `now`, computed in UTC. For 'hourly' this is the most recent HH:minute; for
 * 'weekly' the most recent matching weekday+time (walking back up to 8 days); for
 * 'monthly' the most recent dayOfMonth at hour:minute.
 */
export function previousExpectedFire(schedule: CronSchedule, now: Date): Date {
  if (schedule.kind === 'hourly') {
    const d = new Date(now.getTime());
    d.setUTCMinutes(schedule.minute, 0, 0);
    if (d.getTime() > now.getTime()) d.setUTCHours(d.getUTCHours() - 1);
    return d;
  }

  if (schedule.kind === 'weekly') {
    const weekdays = schedule.weekdays ?? [];
    for (let i = 0; i <= 8; i++) {
      const c = new Date(now.getTime());
      c.setUTCDate(c.getUTCDate() - i);
      c.setUTCHours(schedule.hour ?? 0, schedule.minute, 0, 0);
      if (c.getTime() <= now.getTime() && weekdays.includes(c.getUTCDay())) {
        return c;
      }
    }
    // Unreachable for a non-empty weekday set; return now as a safe floor.
    return new Date(now.getTime());
  }

  // monthly
  const dom = schedule.dayOfMonth ?? 1;
  const c = new Date(now.getTime());
  c.setUTCDate(dom);
  c.setUTCHours(schedule.hour ?? 0, schedule.minute, 0, 0);
  if (c.getTime() > now.getTime()) {
    // This month's fire hasn't happened yet — use last month's.
    c.setUTCMonth(c.getUTCMonth() - 1, dom);
    c.setUTCHours(schedule.hour ?? 0, schedule.minute, 0, 0);
  }
  return c;
}

export type CronCheck = {
  job: string;
  /** ISO timestamp of the most recent expected fire time. */
  expectedFireAt: string;
  /** ISO timestamp of the last successful run, or null if none on record. */
  lastSuccessAt: string | null;
  /** Minutes since the last successful run, or null if none on record. */
  ageMinutes: number | null;
  /** True when the expected fire (+ margin) has passed with no success after it. */
  overdue: boolean;
};

/**
 * Decide whether a single cron is overdue: the last expected fire time has passed
 * by more than the margin, and no successful run started at/after that fire time.
 */
export function evaluateCron(
  schedule: CronSchedule,
  lastSuccessAt: Date | null,
  now: Date
): CronCheck {
  const fire = previousExpectedFire(schedule, now);
  const pastMargin = now.getTime() >= fire.getTime() + schedule.marginMinutes * 60_000;
  const ranThisPeriod = lastSuccessAt !== null && lastSuccessAt.getTime() >= fire.getTime();
  return {
    job: schedule.job,
    expectedFireAt: fire.toISOString(),
    lastSuccessAt: lastSuccessAt ? lastSuccessAt.toISOString() : null,
    ageMinutes: lastSuccessAt
      ? Math.round((now.getTime() - lastSuccessAt.getTime()) / 60_000)
      : null,
    overdue: pastMargin && !ranThisPeriod
  };
}

export type OddsUsageCheck = {
  used: number;
  cap: number;
  fractionUsed: number;
  /** At/over the monthly cap — sync is halted (canSyncNow returns false). */
  overCap: boolean;
  /** Informational: within ODDS_NEAR_CAP_FRACTION of the cap. */
  nearCap: boolean;
};

/** Summarize Odds API usage against the monthly cap, or null when unconfigured. */
export function evaluateOddsUsage(
  used: number | null | undefined,
  cap: number | null | undefined
): OddsUsageCheck | null {
  if (cap === null || cap === undefined || cap <= 0) return null;
  const u = used ?? 0;
  const fractionUsed = u / cap;
  return {
    used: u,
    cap,
    fractionUsed,
    overCap: u >= cap,
    nearCap: fractionUsed >= ODDS_NEAR_CAP_FRACTION
  };
}

export type HealthReport = {
  status: 'ok' | 'degraded';
  checkedAt: string;
  crons: CronCheck[];
  odds: OddsUsageCheck | null;
  /** Names of the checks that are degraded (overdue jobs, plus 'odds-usage'). */
  stale: string[];
};

/**
 * Build the whole-system health report the watchdog endpoint returns. Status is
 * 'degraded' if any cron is overdue or odds sync is at/over cap; otherwise 'ok'.
 * `nearCap` is informational only and does not degrade status.
 */
export function buildHealthReport(input: {
  now: Date;
  lastSuccessByJob: Map<string, Date | null>;
  oddsUsed?: number | null;
  oddsCap?: number | null;
  schedules?: readonly CronSchedule[];
}): HealthReport {
  const schedules = input.schedules ?? CRON_SCHEDULES;
  const crons = schedules.map((s) =>
    evaluateCron(s, input.lastSuccessByJob.get(s.job) ?? null, input.now)
  );
  const odds = evaluateOddsUsage(input.oddsUsed, input.oddsCap);

  const stale = crons.filter((c) => c.overdue).map((c) => c.job);
  if (odds?.overCap) stale.push('odds-usage');

  return {
    status: stale.length === 0 ? 'ok' : 'degraded',
    checkedAt: input.now.toISOString(),
    crons,
    odds,
    stale
  };
}

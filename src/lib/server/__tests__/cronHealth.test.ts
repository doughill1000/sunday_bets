import { describe, it, expect } from 'vitest';
import {
  type CronSchedule,
  previousExpectedFire,
  evaluateCron,
  evaluateOddsUsage,
  buildHealthReport
} from '$lib/server/cronHealth';

// 2026-07-07 is a Tuesday (getUTCDay() === 2); 2026-07-10 is a Friday.
const GRADE: CronSchedule = {
  job: 'grade',
  kind: 'weekly',
  weekdays: [2],
  hour: 9,
  minute: 0,
  marginMinutes: 60
};
const PREGAME: CronSchedule = { job: 'pregame', kind: 'hourly', minute: 0, marginMinutes: 45 };
const RESET: CronSchedule = {
  job: 'reset-odds-usage',
  kind: 'monthly',
  dayOfMonth: 1,
  hour: 0,
  minute: 5,
  marginMinutes: 180
};

const iso = (s: string) => new Date(s);

describe('previousExpectedFire', () => {
  it('hourly → most recent HH:00 at or before now', () => {
    expect(previousExpectedFire(PREGAME, iso('2026-07-10T14:37:00Z')).toISOString()).toBe(
      '2026-07-10T14:00:00.000Z'
    );
    // Exactly on the hour counts as this hour, not the previous one.
    expect(previousExpectedFire(PREGAME, iso('2026-07-10T14:00:00Z')).toISOString()).toBe(
      '2026-07-10T14:00:00.000Z'
    );
  });

  it('weekly → this week once the scheduled time has passed', () => {
    expect(previousExpectedFire(GRADE, iso('2026-07-07T10:00:00Z')).toISOString()).toBe(
      '2026-07-07T09:00:00.000Z'
    );
    // Later in the same week still points at Tuesday.
    expect(previousExpectedFire(GRADE, iso('2026-07-09T08:00:00Z')).toISOString()).toBe(
      '2026-07-07T09:00:00.000Z'
    );
  });

  it('weekly → last week when this week has not fired yet', () => {
    // Tuesday 08:00, before the 09:00 fire → previous Tuesday.
    expect(previousExpectedFire(GRADE, iso('2026-07-07T08:00:00Z')).toISOString()).toBe(
      '2026-06-30T09:00:00.000Z'
    );
  });

  it('monthly → the 1st of this month or the previous month before it fires', () => {
    expect(previousExpectedFire(RESET, iso('2026-07-10T12:00:00Z')).toISOString()).toBe(
      '2026-07-01T00:05:00.000Z'
    );
    expect(previousExpectedFire(RESET, iso('2026-07-01T00:00:00Z')).toISOString()).toBe(
      '2026-06-01T00:05:00.000Z'
    );
  });
});

describe('evaluateCron', () => {
  it('is not overdue when a run succeeded this period', () => {
    const now = iso('2026-07-07T11:00:00Z');
    const check = evaluateCron(GRADE, iso('2026-07-07T09:05:00Z'), now);
    expect(check.overdue).toBe(false);
    expect(check.expectedFireAt).toBe('2026-07-07T09:00:00.000Z');
    expect(check.ageMinutes).toBe(115);
  });

  it('is overdue when the last success predates this period and margin has passed', () => {
    const now = iso('2026-07-07T11:00:00Z');
    // Last success was last Tuesday — this week's run is missing.
    const check = evaluateCron(GRADE, iso('2026-06-30T09:05:00Z'), now);
    expect(check.overdue).toBe(true);
  });

  it('is overdue when there is no success on record at all', () => {
    const check = evaluateCron(GRADE, null, iso('2026-07-07T11:00:00Z'));
    expect(check.overdue).toBe(true);
    expect(check.lastSuccessAt).toBeNull();
    expect(check.ageMinutes).toBeNull();
  });

  it('is NOT overdue inside the grace margin, even with no success yet', () => {
    // 30 min after the 09:00 fire, margin is 60 — still within grace.
    const check = evaluateCron(GRADE, null, iso('2026-07-07T09:30:00Z'));
    expect(check.overdue).toBe(false);
  });

  it('handles the hourly job', () => {
    const now = iso('2026-07-10T14:50:00Z'); // 50 min past 14:00, margin 45 → past margin
    expect(evaluateCron(PREGAME, iso('2026-07-10T14:03:00Z'), now).overdue).toBe(false);
    expect(evaluateCron(PREGAME, iso('2026-07-10T13:05:00Z'), now).overdue).toBe(true);
  });

  it('handles the monthly job without month-cadence ambiguity', () => {
    const now = iso('2026-07-03T00:00:00Z'); // well past the 07-01 00:05 fire + 3h margin
    expect(evaluateCron(RESET, iso('2026-07-01T00:06:00Z'), now).overdue).toBe(false);
    expect(evaluateCron(RESET, iso('2026-06-01T00:06:00Z'), now).overdue).toBe(true);
  });
});

describe('evaluateOddsUsage', () => {
  it('returns null when the cap is unconfigured', () => {
    expect(evaluateOddsUsage(10, null)).toBeNull();
    expect(evaluateOddsUsage(10, undefined)).toBeNull();
    expect(evaluateOddsUsage(10, 0)).toBeNull();
  });

  it('flags near-cap (informational) and over-cap (degrading)', () => {
    expect(evaluateOddsUsage(950, 1000)).toMatchObject({ nearCap: true, overCap: false });
    expect(evaluateOddsUsage(1000, 1000)).toMatchObject({ nearCap: true, overCap: true });
    expect(evaluateOddsUsage(1100, 1000)).toMatchObject({ overCap: true });
    expect(evaluateOddsUsage(100, 1000)).toMatchObject({ nearCap: false, overCap: false });
  });

  it('treats missing usage as zero', () => {
    expect(evaluateOddsUsage(null, 1000)).toMatchObject({ used: 0, fractionUsed: 0 });
  });
});

describe('buildHealthReport', () => {
  const schedules: CronSchedule[] = [GRADE, PREGAME];
  const now = iso('2026-07-07T11:00:00Z');

  it('is ok when every cron ran on time and odds are under cap', () => {
    const report = buildHealthReport({
      now,
      lastSuccessByJob: new Map([
        ['grade', iso('2026-07-07T09:05:00Z')],
        ['pregame', iso('2026-07-07T11:00:00Z')]
      ]),
      oddsUsed: 100,
      oddsCap: 1000,
      schedules
    });
    expect(report.status).toBe('ok');
    expect(report.stale).toEqual([]);
  });

  it('degrades and lists the overdue job', () => {
    const report = buildHealthReport({
      now,
      lastSuccessByJob: new Map([
        ['grade', iso('2026-06-30T09:05:00Z')], // stale — last week
        ['pregame', iso('2026-07-07T11:00:00Z')]
      ]),
      schedules
    });
    expect(report.status).toBe('degraded');
    expect(report.stale).toContain('grade');
    expect(report.stale).not.toContain('pregame');
  });

  it('degrades on over-cap odds usage even when all crons are healthy', () => {
    const report = buildHealthReport({
      now,
      lastSuccessByJob: new Map([
        ['grade', iso('2026-07-07T09:05:00Z')],
        ['pregame', iso('2026-07-07T11:00:00Z')]
      ]),
      oddsUsed: 1000,
      oddsCap: 1000,
      schedules
    });
    expect(report.status).toBe('degraded');
    expect(report.stale).toEqual(['odds-usage']);
  });

  it('stays ok when odds are near the cap but not over it', () => {
    const report = buildHealthReport({
      now,
      lastSuccessByJob: new Map([
        ['grade', iso('2026-07-07T09:05:00Z')],
        ['pregame', iso('2026-07-07T11:00:00Z')]
      ]),
      oddsUsed: 950,
      oddsCap: 1000,
      schedules
    });
    expect(report.status).toBe('ok');
    expect(report.odds?.nearCap).toBe(true);
  });
});

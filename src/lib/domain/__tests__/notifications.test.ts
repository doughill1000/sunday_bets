import { describe, it, expect } from 'vitest';
import {
  parseNotificationPrefs,
  DEFAULT_NOTIFICATION_PREFS,
  spreadRelativeToHome,
  lineMovementPoints,
  shouldNotifyLineShift
} from '../notifications';

describe('parseNotificationPrefs', () => {
  it('returns defaults for null/garbage', () => {
    expect(parseNotificationPrefs(null)).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(parseNotificationPrefs('nope')).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(parseNotificationPrefs(42)).toEqual(DEFAULT_NOTIFICATION_PREFS);
  });

  it('merges partial objects over defaults', () => {
    const p = parseNotificationPrefs({ enabled: true, line_shift: { threshold: 3 } });
    expect(p.enabled).toBe(true);
    expect(p.pick_reminders).toBe(true);
    expect(p.line_shift).toEqual({ enabled: true, threshold: 3 });
  });

  it('rejects non-positive thresholds', () => {
    expect(parseNotificationPrefs({ line_shift: { threshold: 0 } }).line_shift.threshold).toBe(2);
    expect(parseNotificationPrefs({ line_shift: { threshold: -5 } }).line_shift.threshold).toBe(2);
  });
});

describe('spreadRelativeToHome', () => {
  it('keeps the home value, negates the away value', () => {
    expect(spreadRelativeToHome(1, -3, 1)).toBe(-3);
    expect(spreadRelativeToHome(2, -3, 1)).toBe(3);
  });
});

describe('lineMovementPoints', () => {
  it('is zero when nothing moved', () => {
    expect(
      lineMovementPoints({
        homeTeamId: 1,
        lockedTeamId: 1,
        lockedValue: -3,
        currentTeamId: 1,
        currentValue: -3
      })
    ).toBe(0);
  });

  it('normalizes lines stored against different reference teams', () => {
    // locked: home -3 ; current: away +5 => home -5 => moved 2 points
    expect(
      lineMovementPoints({
        homeTeamId: 1,
        lockedTeamId: 1,
        lockedValue: -3,
        currentTeamId: 2,
        currentValue: 5
      })
    ).toBe(2);
  });

  it('handles half-point moves', () => {
    expect(
      lineMovementPoints({
        homeTeamId: 1,
        lockedTeamId: 1,
        lockedValue: -2.5,
        currentTeamId: 1,
        currentValue: -5
      })
    ).toBe(2.5);
  });
});

describe('shouldNotifyLineShift', () => {
  const base = {
    movement: 3,
    threshold: 2,
    lineShiftEnabled: true,
    lastNotifiedTo: null as number | null,
    currentTo: -5
  };

  it('fires when over threshold and never notified', () => {
    expect(shouldNotifyLineShift(base)).toBe(true);
  });

  it('is suppressed when the feature is off', () => {
    expect(shouldNotifyLineShift({ ...base, lineShiftEnabled: false })).toBe(false);
  });

  it('is suppressed below threshold', () => {
    expect(shouldNotifyLineShift({ ...base, movement: 1 })).toBe(false);
  });

  it('dedupes when already notified at the current value', () => {
    expect(shouldNotifyLineShift({ ...base, lastNotifiedTo: -5 })).toBe(false);
  });

  it('re-fires when the line has moved further since last alert', () => {
    expect(shouldNotifyLineShift({ ...base, lastNotifiedTo: -4 })).toBe(true);
  });
});

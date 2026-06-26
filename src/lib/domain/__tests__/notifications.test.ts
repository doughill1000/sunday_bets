import { describe, it, expect } from 'vitest';
import {
  parseNotificationPrefs,
  DEFAULT_NOTIFICATION_PREFS,
  spreadRelativeToHome,
  lineMovementPoints,
  shouldNotifyLineShift,
  formatRecapBody
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

  it('defaults results_recap when absent and parses it when present', () => {
    // Rows written before the field existed fall back to the default (true).
    expect(parseNotificationPrefs({ enabled: true }).results_recap).toBe(true);
    expect(parseNotificationPrefs({ results_recap: false }).results_recap).toBe(false);
    expect(parseNotificationPrefs({ results_recap: 'yes' }).results_recap).toBe(true);
  });
});

describe('formatRecapBody', () => {
  it('summarizes record, pushes/missed, and net points', () => {
    expect(formatRecapBody({ wins: 3, losses: 1, pushes: 1, missed: 0, net: 7 })).toBe(
      '3-1 with 1 push · +7 points this week. Tap for standings.'
    );
  });

  it('omits push/missed clauses when zero', () => {
    expect(formatRecapBody({ wins: 2, losses: 2, pushes: 0, missed: 0, net: 0 })).toBe(
      '2-2 · 0 points this week. Tap for standings.'
    );
  });

  it('combines pushes and missed and pluralizes', () => {
    expect(formatRecapBody({ wins: 0, losses: 4, pushes: 2, missed: 1, net: -4 })).toBe(
      '0-4 with 2 pushes and 1 missed · -4 points this week. Tap for standings.'
    );
  });

  it('uses singular "point" for ±1', () => {
    expect(formatRecapBody({ wins: 1, losses: 0, pushes: 0, missed: 0, net: 1 })).toBe(
      '1-0 · +1 point this week. Tap for standings.'
    );
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
    recentlyNotified: false
  };

  it('fires when over threshold and not recently notified', () => {
    expect(shouldNotifyLineShift(base)).toBe(true);
  });

  it('is suppressed when the feature is off', () => {
    expect(shouldNotifyLineShift({ ...base, lineShiftEnabled: false })).toBe(false);
  });

  it('is suppressed below threshold', () => {
    expect(shouldNotifyLineShift({ ...base, movement: 1 })).toBe(false);
  });

  it('is suppressed by the once-per-day cap', () => {
    expect(shouldNotifyLineShift({ ...base, recentlyNotified: true })).toBe(false);
  });
});

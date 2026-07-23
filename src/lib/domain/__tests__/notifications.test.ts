import { describe, it, expect } from 'vitest';
import {
  parseNotificationPrefs,
  DEFAULT_NOTIFICATION_PREFS,
  spreadRelativeToHome,
  lineShiftForPick,
  shouldNotifyLineShift,
  pregamePushBody,
  formatRecapBody,
  recapPushBody,
  LINE_SHIFT_THRESHOLD_POINTS
} from '../notifications';

describe('parseNotificationPrefs', () => {
  it('returns defaults for null/garbage', () => {
    expect(parseNotificationPrefs(null)).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(parseNotificationPrefs('nope')).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(parseNotificationPrefs(42)).toEqual(DEFAULT_NOTIFICATION_PREFS);
  });

  it('merges partial objects over defaults', () => {
    const p = parseNotificationPrefs({ enabled: true, line_shift: { enabled: false } });
    expect(p.enabled).toBe(true);
    expect(p.pick_reminders).toBe(true);
    expect(p.line_shift).toEqual({ enabled: false });
  });

  it('ignores a stale threshold left over from before #693', () => {
    // Older stored jsonb may still carry `threshold` — it must not resurface.
    expect(parseNotificationPrefs({ line_shift: { threshold: 5 } }).line_shift).toEqual({
      enabled: true
    });
    expect(
      (
        parseNotificationPrefs({ line_shift: { threshold: 5 } }).line_shift as {
          threshold?: number;
        }
      ).threshold
    ).toBeUndefined();
  });

  it('defaults results_recap when absent and parses it when present', () => {
    // Rows written before the field existed fall back to the default (true).
    expect(parseNotificationPrefs({ enabled: true }).results_recap).toBe(true);
    expect(parseNotificationPrefs({ results_recap: false }).results_recap).toBe(false);
    expect(parseNotificationPrefs({ results_recap: 'yes' }).results_recap).toBe(true);
  });

  it('defaults ai_recap when absent and parses it when present', () => {
    // Rows written before the field existed fall back to the default (true).
    expect(parseNotificationPrefs({ enabled: true }).ai_recap).toBe(true);
    expect(parseNotificationPrefs({ ai_recap: false }).ai_recap).toBe(false);
    expect(parseNotificationPrefs({ ai_recap: 'yes' }).ai_recap).toBe(true);
  });
});

describe('formatRecapBody', () => {
  it('summarizes record, pushes/missed, and net points', () => {
    expect(formatRecapBody({ wins: 3, losses: 1, pushes: 1, missed: 0, net: 7 })).toBe(
      '3-1 with 1 push · +7 points this week. Tap for the breakdown.'
    );
  });

  it('omits push/missed clauses when zero', () => {
    expect(formatRecapBody({ wins: 2, losses: 2, pushes: 0, missed: 0, net: 0 })).toBe(
      '2-2 · 0 points this week. Tap for the breakdown.'
    );
  });

  it('combines pushes and missed and pluralizes', () => {
    expect(formatRecapBody({ wins: 0, losses: 4, pushes: 2, missed: 1, net: -4 })).toBe(
      '0-4 with 2 pushes and 1 missed · -4 points this week. Tap for the breakdown.'
    );
  });

  it('uses singular "point" for ±1', () => {
    expect(formatRecapBody({ wins: 1, losses: 0, pushes: 0, missed: 0, net: 1 })).toBe(
      '1-0 · +1 point this week. Tap for the breakdown.'
    );
  });
});

describe('recapPushBody', () => {
  it('uses the first sentence of the recap as the teaser', () => {
    expect(recapPushBody('Kefke ran the table this week. Nobody else came close.')).toBe(
      'Kefke ran the table this week.'
    );
  });

  it('keeps decimals and percentages intact (no mid-number split)', () => {
    expect(
      recapPushBody('Doug leaned on Chiefs -3.5 and 62% consensus, then got cooked. Brutal.')
    ).toBe('Doug leaned on Chiefs -3.5 and 62% consensus, then got cooked.');
  });

  it('handles ? and ! sentence enders', () => {
    expect(recapPushBody('What was Sam thinking? The fade backfired hard.')).toBe(
      'What was Sam thinking?'
    );
  });

  it('returns the whole line when there is no sentence break', () => {
    expect(recapPushBody('A quiet week, nothing much to report')).toBe(
      'A quiet week, nothing much to report'
    );
  });

  it('caps an overly long opener with an ellipsis', () => {
    const out = recapPushBody('A'.repeat(200) + '. Second.');
    expect(out.length).toBeLessThanOrEqual(151);
    expect(out.endsWith('…')).toBe(true);
  });

  it('falls back to a generic line for empty/whitespace prose', () => {
    expect(recapPushBody('')).toBe('Your league’s AI recap just dropped.');
    expect(recapPushBody('   ')).toBe('Your league’s AI recap just dropped.');
  });
});

describe('spreadRelativeToHome', () => {
  it('keeps the home value, negates the away value', () => {
    expect(spreadRelativeToHome(1, -3, 1)).toBe(-3);
    expect(spreadRelativeToHome(2, -3, 1)).toBe(3);
  });
});

describe('lineShiftForPick', () => {
  it('reports no movement when the line is unchanged', () => {
    // Bills (team 1) -3 in both rows.
    expect(
      lineShiftForPick({
        pickedTeamId: 1,
        previousTeamId: 1,
        previousValue: -3,
        currentTeamId: 1,
        currentValue: -3
      })
    ).toEqual({ points: 0, direction: 'none' });
  });

  it('is against the pick when the market backs off the picked side', () => {
    // Picked team went from -3 to -1: the market lost faith in your side.
    expect(
      lineShiftForPick({
        pickedTeamId: 1,
        previousTeamId: 1,
        previousValue: -3,
        currentTeamId: 1,
        currentValue: -1
      })
    ).toEqual({ points: 2, direction: 'against' });
  });

  it('is favorable when the market moves further onto the picked side', () => {
    // Locked Bills -1, line now Bills -3.5: the brag-fuel direction.
    expect(
      lineShiftForPick({
        pickedTeamId: 1,
        previousTeamId: 1,
        previousValue: -1,
        currentTeamId: 1,
        currentValue: -3.5
      })
    ).toEqual({ points: 2.5, direction: 'favorable' });
  });

  it('normalizes rows stored against different reference teams (against)', () => {
    // Previous row references the picked team (-2.5); current row references the
    // opponent (-2.5 → +2.5 for the pick): a 5-pt swing against the pick.
    expect(
      lineShiftForPick({
        pickedTeamId: 1,
        previousTeamId: 1,
        previousValue: -2.5,
        currentTeamId: 2,
        currentValue: -2.5
      })
    ).toEqual({ points: 5, direction: 'against' });
  });

  it('normalizes rows stored against different reference teams (favorable)', () => {
    // Previous row references the opponent (+3 → pick -3); current references
    // the pick directly at -5.5: 2.5 pts further onto the picked side.
    expect(
      lineShiftForPick({
        pickedTeamId: 1,
        previousTeamId: 2,
        previousValue: 3,
        currentTeamId: 1,
        currentValue: -5.5
      })
    ).toEqual({ points: 2.5, direction: 'favorable' });
  });

  it('detects an unchanged line even when the reference team flips between rows', () => {
    // Same line, opposite reference teams: previous pick-relative -3, current
    // opponent +3 → pick-relative -3. No movement.
    expect(
      lineShiftForPick({
        pickedTeamId: 1,
        previousTeamId: 1,
        previousValue: -3,
        currentTeamId: 2,
        currentValue: 3
      })
    ).toEqual({ points: 0, direction: 'none' });
  });
});

describe('shouldNotifyLineShift', () => {
  const base = {
    movement: 3,
    direction: 'against' as const,
    freshJump: true,
    lineShiftEnabled: true,
    recentlyNotified: false
  };

  it('fires on a fresh against-you jump at or over the threshold', () => {
    expect(shouldNotifyLineShift(base)).toBe(true);
    expect(shouldNotifyLineShift({ ...base, movement: LINE_SHIFT_THRESHOLD_POINTS })).toBe(true);
  });

  it('is suppressed when the feature is off', () => {
    expect(shouldNotifyLineShift({ ...base, lineShiftEnabled: false })).toBe(false);
  });

  it('is suppressed for favorable or flat moves (against-you only)', () => {
    expect(shouldNotifyLineShift({ ...base, direction: 'favorable' })).toBe(false);
    expect(shouldNotifyLineShift({ ...base, direction: 'none', movement: 0 })).toBe(false);
  });

  it('is suppressed when the jump settled before the pregame window', () => {
    expect(shouldNotifyLineShift({ ...base, freshJump: false })).toBe(false);
  });

  it('is suppressed below the fixed threshold', () => {
    expect(shouldNotifyLineShift({ ...base, movement: 1 })).toBe(false);
  });

  it('is suppressed by the once-per-day cap', () => {
    expect(shouldNotifyLineShift({ ...base, recentlyNotified: true })).toBe(false);
  });
});

describe('pregamePushBody', () => {
  it('returns null when there is nothing to say', () => {
    expect(pregamePushBody({ unpickedCount: 0, lineShifts: [] })).toBeNull();
  });

  it('builds the reminder-only form (singular and plural)', () => {
    expect(pregamePushBody({ unpickedCount: 1, lineShifts: [] })).toEqual({
      title: 'Picks lock soon',
      body: 'You have 1 unpicked game kicking off soon.'
    });
    expect(pregamePushBody({ unpickedCount: 3, lineShifts: [] })).toEqual({
      title: 'Picks lock soon',
      body: 'You have 3 unpicked games kicking off soon.'
    });
  });

  it('builds the single line-shift form with side and fresh-jump magnitude', () => {
    expect(
      pregamePushBody({ unpickedCount: 0, lineShifts: [{ team: 'Bills', points: 2.5 }] })
    ).toEqual({
      title: 'Line moved on your pick',
      body: "The line on your Bills pick moved 2.5 pts — here's your shot to react before kickoff."
    });
  });

  it('builds the multi line-shift form naming each side', () => {
    expect(
      pregamePushBody({
        unpickedCount: 0,
        lineShifts: [
          { team: 'Bills', points: 2.5 },
          { team: 'Chiefs', points: 2 }
        ]
      })
    ).toEqual({
      title: 'Lines moved on your picks',
      body: "Lines moved on 2 of your picks (Bills 2.5 pts, Chiefs 2 pts) — here's your shot to react before kickoff."
    });
  });

  it('merges a reminder and line-shifts into one body', () => {
    expect(
      pregamePushBody({ unpickedCount: 2, lineShifts: [{ team: 'Bills', points: 2.5 }] })
    ).toEqual({
      title: 'Heads up before kickoff',
      body: 'The line on your Bills pick moved 2.5 pts, and you have 2 unpicked games kicking off soon. Your shot to react before kickoff.'
    });
  });
});

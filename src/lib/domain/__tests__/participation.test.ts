import { describe, expect, it } from 'vitest';
import { participationStartMs, isWithinParticipation, isGameRemindable } from '../participation';

// ADR-0037 / #724: the TS mirror of public._participation_start, used by the read surfaces
// that enumerate membership x games themselves instead of reading pick_settlement.

const SENTINEL = '2000-01-01T00:00:00Z';

describe('participationStartMs', () => {
  it('is the LATER of the league competition start and the member join', () => {
    expect(participationStartMs('2025-09-01T00:00:00Z', '2025-10-01T00:00:00Z')).toBe(
      Date.parse('2025-10-01T00:00:00Z')
    );
    expect(participationStartMs('2025-11-01T00:00:00Z', '2025-10-01T00:00:00Z')).toBe(
      Date.parse('2025-11-01T00:00:00Z')
    );
  });

  it('lets the join govern when the league carries the include-all sentinel', () => {
    expect(participationStartMs(SENTINEL, '2025-10-01T00:00:00Z')).toBe(
      Date.parse('2025-10-01T00:00:00Z')
    );
  });

  it('falls back to whichever term is present', () => {
    expect(participationStartMs(null, '2025-10-01T00:00:00Z')).toBe(
      Date.parse('2025-10-01T00:00:00Z')
    );
    expect(participationStartMs('2025-10-01T00:00:00Z', undefined)).toBe(
      Date.parse('2025-10-01T00:00:00Z')
    );
  });

  it('returns null when neither term is known, meaning "no boundary to apply"', () => {
    expect(participationStartMs(null, null)).toBeNull();
    expect(participationStartMs(undefined, undefined)).toBeNull();
  });

  it('compares instants, not strings: a non-UTC offset still resolves correctly', () => {
    // 2025-10-01T00:00:00Z is the later instant despite sorting earlier lexically.
    expect(participationStartMs('2025-09-30T22:00:00-04:00', '2025-10-01T00:00:00Z')).toBe(
      Date.parse('2025-10-01T02:00:00Z')
    );
  });
});

describe('isWithinParticipation', () => {
  const start = Date.parse('2025-10-01T00:00:00Z');

  it('excludes a kickoff before the boundary', () => {
    expect(isWithinParticipation('2025-09-30T23:59:59Z', start)).toBe(false);
  });

  it('includes a kickoff exactly at the boundary (>= , not >)', () => {
    expect(isWithinParticipation('2025-10-01T00:00:00Z', start)).toBe(true);
  });

  it('includes a kickoff after the boundary', () => {
    expect(isWithinParticipation('2025-10-05T17:00:00Z', start)).toBe(true);
  });

  it('applies no boundary when there is none to apply', () => {
    expect(isWithinParticipation('1999-01-01T00:00:00Z', null)).toBe(true);
    expect(isWithinParticipation('1999-01-01T00:00:00Z', undefined)).toBe(true);
  });

  it('does not exclude on an unparseable kickoff', () => {
    expect(isWithinParticipation('not-a-date', start)).toBe(true);
  });
});

describe('isGameRemindable', () => {
  const GAME = '2025-09-14T17:00:00Z';

  it('reminds when the member is in no league boundary data (pre-ADR behaviour)', () => {
    expect(isGameRemindable(GAME, [])).toBe(true);
  });

  it('reminds when a running league makes the game the member’s to pick', () => {
    expect(
      isGameRemindable(GAME, [{ competitionStartsAt: SENTINEL, joinedAt: '2025-09-01T00:00:00Z' }])
    ).toBe(true);
  });

  it('does not remind when the only league has not started by this game', () => {
    expect(
      isGameRemindable(GAME, [{ competitionStartsAt: '2025-11-01T00:00:00Z', joinedAt: SENTINEL }])
    ).toBe(false);
  });

  it('does not remind for a game before the member joined their only league', () => {
    expect(
      isGameRemindable(GAME, [{ competitionStartsAt: SENTINEL, joinedAt: '2025-10-01T00:00:00Z' }])
    ).toBe(false);
  });

  it('reminds if ANY of the member’s leagues makes the game eligible', () => {
    // In a not-yet-started league AND a running one — still owed the running one.
    expect(
      isGameRemindable(GAME, [
        { competitionStartsAt: '2025-11-01T00:00:00Z', joinedAt: SENTINEL },
        { competitionStartsAt: SENTINEL, joinedAt: '2025-09-01T00:00:00Z' }
      ])
    ).toBe(true);
  });
});

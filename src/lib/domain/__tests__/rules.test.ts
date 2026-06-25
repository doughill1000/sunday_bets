import { describe, it, expect } from 'vitest';
import { findAllInHolder, allInIntent, kickoffPassed, pickStatus } from '../rules';
import type { PickEntry } from '$lib/types/picks';
import type { PickGame } from '$lib/types/games';

const FUTURE = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 60 * 60 * 1000).toISOString();

function game(id: string, over = {}): PickGame {
  return {
    id,
    kickoff: FUTURE,
    home: `${id}H`,
    away: `${id}A`,
    homeTeamId: 1,
    awayTeamId: 2,
    spreadTeamId: 1,
    spreadValue: -3,
    ...over
  };
}

function picks(o: Record<string, Partial<PickEntry>> = {}): Record<string, PickEntry> {
  return o as Record<string, PickEntry>;
}

describe('kickoffPassed', () => {
  const now = Date.parse('2026-01-01T12:00:00Z');

  it('is true once kickoff is at or before the reference time', () => {
    expect(kickoffPassed('2026-01-01T11:59:00Z', now)).toBe(true);
    expect(kickoffPassed('2026-01-01T12:00:00Z', now)).toBe(true);
  });

  it('is false for a future kickoff', () => {
    expect(kickoffPassed('2026-01-01T12:00:01Z', now)).toBe(false);
  });
});

describe('pickStatus', () => {
  const now = Date.parse('2026-01-01T12:00:00Z');
  const future = '2026-01-01T12:00:01Z';
  const past = '2026-01-01T11:59:00Z';

  it('reports saved even after kickoff has passed', () => {
    expect(pickStatus({ lockedPick: { team: 'home', weight: 'M' } }, past, now)).toBe('saved');
  });

  it('reports missed when kickoff passed without a saved pick', () => {
    expect(pickStatus({ selected: { team: 'home', weight: 'M' } }, past, now)).toBe('missed');
    expect(pickStatus(undefined, past, now)).toBe('missed');
  });

  it('reports open before kickoff without a saved pick', () => {
    expect(pickStatus(undefined, future, now)).toBe('open');
  });
});

describe('findAllInHolder', () => {
  it('returns null when no game holds an All-In', () => {
    const games = [game('g1'), game('g2')];
    expect(findAllInHolder(games, picks({ g1: { selected: { team: 'home', weight: 'M' } } }))).toBe(
      null
    );
  });

  it('finds a staged All-In', () => {
    const games = [game('g1'), game('g2')];
    const holder = findAllInHolder(
      games,
      picks({ g2: { selected: { team: 'away', weight: 'A' } } })
    );
    expect(holder).toMatchObject({ game: { id: 'g2' }, team: 'away', locked: false });
  });

  it('prefers a locked All-In over a staged one', () => {
    const games = [game('g1'), game('g2')];
    const holder = findAllInHolder(
      games,
      picks({
        g1: { selected: { team: 'home', weight: 'A' } },
        g2: { lockedPick: { team: 'away', weight: 'A' } }
      })
    );
    expect(holder).toMatchObject({ game: { id: 'g2' }, team: 'away', locked: true });
  });
});

describe('allInIntent', () => {
  it('is a simple confirm when no other game holds All-In', () => {
    const games = [game('g1'), game('g2')];
    expect(
      allInIntent('g1', games, picks({ g2: { selected: { team: 'home', weight: 'M' } } }))
    ).toEqual({ kind: 'confirm' });
  });

  it('is a confirm when this very game already holds the All-In', () => {
    const games = [game('g1')];
    expect(
      allInIntent('g1', games, picks({ g1: { selected: { team: 'home', weight: 'A' } } }))
    ).toEqual({ kind: 'confirm' });
  });

  it('is a move when another pre-kickoff game holds the All-In', () => {
    const games = [game('g1'), game('g2')];
    const intent = allInIntent(
      'g1',
      games,
      picks({ g2: { lockedPick: { team: 'away', weight: 'A' } } })
    );
    expect(intent.kind).toBe('move');
    if (intent.kind === 'move') expect(intent.from.game.id).toBe('g2');
  });

  it('is blocked when the holder has already kicked off', () => {
    const games = [game('g1'), game('g2', { kickoff: PAST })];
    const intent = allInIntent(
      'g1',
      games,
      picks({ g2: { lockedPick: { team: 'away', weight: 'A' } } })
    );
    expect(intent.kind).toBe('blocked');
    if (intent.kind === 'blocked') expect(intent.from.game.id).toBe('g2');
  });

  it('is always a confirm on the final week when unlimited All-In is enabled', () => {
    const games = [game('g1'), game('g2')];
    const intent = allInIntent(
      'g1',
      games,
      picks({ g2: { lockedPick: { team: 'away', weight: 'A' } } }),
      true, // isLastWeek
      true // finalWeekUnlimitedAllin
    );
    expect(intent).toEqual({ kind: 'confirm' });
  });

  it('still moves on the final week when the unlimited exception is disabled', () => {
    const games = [game('g1'), game('g2')];
    const intent = allInIntent(
      'g1',
      games,
      picks({ g2: { lockedPick: { team: 'away', weight: 'A' } } }),
      true, // isLastWeek
      false // finalWeekUnlimitedAllin
    );
    expect(intent.kind).toBe('move');
  });
});

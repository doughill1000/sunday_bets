import { describe, expect, it } from 'vitest';
import { resolvePickResult } from '../pickResult';
import type { PickGame } from '$lib/types/games';
import type { PickEntry } from '$lib/types/picks';
import type { LiveScoreEntry } from '$lib/live/types';

// #823: a completed game on /picks showed nothing but "⏱ Kicked off" forever. The board read
// only the live feed, which ages out with its window (#822), and had no graded fallback. These
// specs pin the precedence that replaces it — graded › unofficial › live › none — with the
// emphasis on the one direction that can silently corrupt a result: a live payload must never
// win over a settled one.

const HOME_ID = 1;
const AWAY_ID = 2;

function game(overrides: Partial<PickGame> = {}): PickGame {
  return {
    id: 'g1',
    kickoff: '2026-08-13T23:00:00Z',
    home: 'PHI',
    away: 'DAL',
    homeTeamId: HOME_ID,
    awayTeamId: AWAY_ID,
    spreadTeamId: HOME_ID,
    spreadValue: -3,
    finalScores: null,
    ...overrides
  };
}

// Home -3, home wins by 6 → the home pick covers by 3.
function homePick(overrides: Partial<PickEntry> = {}): PickEntry {
  return {
    lockedPick: { team: 'home', weight: 'M' },
    lockedSpreadTeamId: HOME_ID,
    lockedSpreadValue: -3,
    ...overrides
  };
}

function score(overrides: Partial<LiveScoreEntry> = {}): LiveScoreEntry {
  return {
    homeScore: 20,
    awayScore: 14,
    status: 'in_progress',
    displayClock: '12:47',
    period: 3,
    ...overrides
  };
}

describe('resolvePickResult — graded', () => {
  it('reads the settled score and outcome once the game is graded', () => {
    const result = resolvePickResult({
      entry: homePick({ outcome: 'win', pointsDelta: 3 }),
      game: game({ finalScores: { home: 24, away: 17 } }),
      liveScore: null
    });

    expect(result).toEqual({
      kind: 'graded',
      homeScore: 24,
      awayScore: 17,
      outcome: 'win',
      pointsDelta: 3
    });
  });

  // The reproduction from the issue: graded hours ago, live window long closed, board blank.
  it('needs no live feed at all — the case that used to render a bare "Kicked off"', () => {
    const result = resolvePickResult({
      entry: homePick({ outcome: 'loss', pointsDelta: -3 }),
      game: game({ finalScores: { home: 10, away: 30 } }),
      liveScore: undefined
    });

    expect(result?.kind).toBe('graded');
  });

  // The AC's precedence guarantee, and the one that matters: the grade cron can settle a game
  // while it is still inside its live window, so the two genuinely coexist. `liveScores.ts`
  // documents this as "yields to graded"; WeeklyPickCard's `isGraded` gate already relies on it.
  it('beats a live payload — a graded result is never superseded', () => {
    const result = resolvePickResult({
      entry: homePick({ outcome: 'win', pointsDelta: 3 }),
      game: game({ finalScores: { home: 24, away: 17 } }),
      liveScore: score({ homeScore: 3, awayScore: 0, period: 1 })
    });

    expect(result?.kind).toBe('graded');
    if (result?.kind !== 'graded') throw new Error('unreachable');
    expect(result.homeScore).toBe(24);
  });

  it('beats an unofficial FINAL payload too', () => {
    const result = resolvePickResult({
      entry: homePick({ outcome: 'win', pointsDelta: 3 }),
      game: game({ finalScores: { home: 24, away: 17 } }),
      liveScore: score({ status: 'final', homeScore: 23, awayScore: 17 })
    });

    expect(result?.kind).toBe('graded');
  });

  // 'missed' is a real settled outcome — grading writes a row for a member who owed a pick and
  // didn't make one. There is no locked pick to project from, so only the graded tier can ever
  // show it.
  it('surfaces a missed pick, which has no locked pick to project from', () => {
    const result = resolvePickResult({
      entry: { outcome: 'missed', pointsDelta: -1 },
      game: game({ finalScores: { home: 24, away: 17 } }),
      liveScore: null
    });

    expect(result).toMatchObject({ kind: 'graded', outcome: 'missed', pointsDelta: -1 });
  });

  // A graded game the member has no settlement row for (e.g. the ADR-0037 participation
  // boundary). The score is still a fact; inventing an outcome would not be. Crucially the tier
  // does NOT depend on the outcome — gating it there would drop this game back to the live tier
  // and let a provisional verdict render over a settled game.
  it('still reports the score when grading wrote no row for this member', () => {
    const result = resolvePickResult({
      entry: undefined,
      game: game({ finalScores: { home: 24, away: 17 } }),
      liveScore: score({ status: 'final' })
    });

    expect(result).toMatchObject({ kind: 'graded', outcome: null, pointsDelta: null });
  });
});

describe('resolvePickResult — unofficial', () => {
  it('labels a FINAL feed payload as its own tier, distinct from live', () => {
    const result = resolvePickResult({
      entry: homePick(),
      game: game(),
      liveScore: score({ status: 'final', displayClock: null, period: null })
    });

    expect(result?.kind).toBe('unofficial');
    if (result?.kind !== 'unofficial') throw new Error('unreachable');
    expect(result.cover.verdict).toBe('covering');
    expect(result.cover.cushion).toBe(3);
  });

  // Staleness exists to stop the board passing a MOVING number off as current. A final score
  // does not move — and since stopping the poll is exactly what makes `fetchedAt` age out, a
  // stale-aware unofficial tier would grey itself out by construction.
  it('is exempt from staleness — a final score is terminal, not stale', () => {
    const result = resolvePickResult({
      entry: homePick(),
      game: game(),
      liveScore: score({ status: 'final', displayClock: null, period: null }),
      liveStale: true
    });

    expect(result?.kind).toBe('unofficial');
    expect(result).not.toHaveProperty('stale');
  });
});

describe('resolvePickResult — live', () => {
  it('mirrors grading against the in-progress score using the frozen line', () => {
    const result = resolvePickResult({ entry: homePick(), game: game(), liveScore: score() });

    expect(result).toMatchObject({ kind: 'live', stale: false });
    if (result?.kind !== 'live') throw new Error('unreachable');
    expect(result.cover.verdict).toBe('covering');
    expect(result.cover.cushion).toBe(3);
  });

  it('carries the feed-freshness flag through for an in-progress score', () => {
    const result = resolvePickResult({
      entry: homePick(),
      game: game(),
      liveScore: score(),
      liveStale: true
    });

    expect(result).toMatchObject({ kind: 'live', stale: true });
  });

  // The line frozen on the pick is what grading will settle against — not whatever the game
  // carries now, which can have moved since (ADR-0003).
  it('prefers the line frozen at lock over the game s current one', () => {
    const result = resolvePickResult({
      entry: homePick({ lockedSpreadValue: -7 }),
      game: game({ spreadValue: -1 }),
      liveScore: score()
    });

    if (result?.kind !== 'live') throw new Error('unreachable');
    expect(result.cover.cushion).toBe(-1); // 20-14 at home -7 → one short
  });

  it('falls back to the game s line when the pick carries no frozen one', () => {
    const result = resolvePickResult({
      entry: { lockedPick: { team: 'home', weight: 'M' } },
      game: game({ spreadValue: -3 }),
      liveScore: score()
    });

    if (result?.kind !== 'live') throw new Error('unreachable');
    expect(result.cover.cushion).toBe(3);
  });
});

describe('resolvePickResult — none', () => {
  it('is null with no feed and no graded score — the honest "kicked off, nothing yet"', () => {
    expect(resolvePickResult({ entry: homePick(), game: game(), liveScore: null })).toBeNull();
  });

  // Unchanged live-window behaviour: a game with no locked pick shows no live verdict. Only the
  // graded tier speaks for a missed pick, and it does so from what grading actually wrote.
  it('is null for an ungraded game with no locked pick, even with a feed', () => {
    expect(resolvePickResult({ entry: undefined, game: game(), liveScore: score() })).toBeNull();
  });

  it('is null when the cover cannot be computed (no team ids)', () => {
    const result = resolvePickResult({
      entry: homePick(),
      game: game({ homeTeamId: null, awayTeamId: null }),
      liveScore: score()
    });

    expect(result).toBeNull();
  });
});

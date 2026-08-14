import { describe, expect, it } from 'vitest';
import { LIVE_WINDOW_MS, activeLiveScores, allGamesFinal, isWithinLiveWindow } from '../config';
import type { LiveScoreEntry } from '../types';

const KICKOFF = Date.UTC(2026, 7, 13, 23, 0, 0); // 2026-08-13 23:00Z, a real preseason TNF slot

function score(partial: Partial<LiveScoreEntry> = {}): LiveScoreEntry {
  return {
    homeScore: 16,
    awayScore: 14,
    status: 'in_progress',
    displayClock: '12:47',
    period: 3,
    ...partial
  };
}

describe('isWithinLiveWindow', () => {
  it('opens at kickoff and is half-open at the far edge', () => {
    expect(isWithinLiveWindow(KICKOFF, KICKOFF - 1)).toBe(false);
    expect(isWithinLiveWindow(KICKOFF, KICKOFF)).toBe(true);
    expect(isWithinLiveWindow(KICKOFF, KICKOFF + LIVE_WINDOW_MS - 1)).toBe(true);
    expect(isWithinLiveWindow(KICKOFF, KICKOFF + LIVE_WINDOW_MS)).toBe(false);
  });

  // The window is sized by the grade cron, not by game length (#823/#831). The binding case is
  // the late-season Saturday slate: `cron-grade.yml` grades it only at Sun 04:00 UTC, so a
  // Saturday 1pm ET final has to stay covered for ~11h or it falls into a gap where the feed has
  // aged out and nothing has been settled — the gap this issue is about.
  it('still covers a Saturday 1pm ET kickoff when its grade lands at Sun 04:00 UTC', () => {
    const satKickoff = Date.UTC(2026, 11, 26, 18, 0, 0); // Sat 1pm ET
    const gradeCron = Date.UTC(2026, 11, 27, 4, 0, 0); // Sun 04:00 UTC
    expect(isWithinLiveWindow(satKickoff, gradeCron)).toBe(true);
  });
});

describe('allGamesFinal', () => {
  it('is true only once every listed game reports final', () => {
    const scores = { g1: score({ status: 'final' }), g2: score({ status: 'final' }) };
    expect(allGamesFinal(['g1', 'g2'], scores)).toBe(true);
  });

  it('is false while any listed game is still in progress', () => {
    const scores = { g1: score({ status: 'final' }), g2: score({ status: 'in_progress' }) };
    expect(allGamesFinal(['g1', 'g2'], scores)).toBe(false);
  });

  // The one that would strand the board: an id the feed hasn't listed yet (a game about to
  // start, or a mapping miss) is UNKNOWN, not settled. Treating it as final would stop the poll
  // before the game had even kicked off.
  it('treats a game with no entry as not final', () => {
    expect(allGamesFinal(['g1', 'g2'], { g1: score({ status: 'final' }) })).toBe(false);
    expect(allGamesFinal(['g1'], {})).toBe(false);
  });

  it('is vacuously true for an empty list — callers gate on the window first', () => {
    expect(allGamesFinal([], {})).toBe(true);
  });
});

describe('activeLiveScores', () => {
  it('passes the payload through while a game is inside its window', () => {
    const scores = { g1: score() };
    expect(activeLiveScores(scores, true)).toBe(scores);
  });

  // The #822 regression. TanStack's `enabled: false` stops the poll but keeps the cached
  // payload alive for as long as the component observing it stays mounted, so the caller can
  // still be holding a full mid-game payload here long after the window shut. Gating the fetch
  // is not enough — the value has to be gated too.
  it('drops a still-cached payload once every game has aged out', () => {
    const stale = { g1: score({ period: 3, displayClock: '12:47' }) };
    expect(activeLiveScores(stale, false)).toEqual({});
  });

  it('drops a cached FINAL just the same — outside the window the graded result is authority', () => {
    const stale = { g1: score({ status: 'final', displayClock: null, period: null }) };
    expect(activeLiveScores(stale, false)).toEqual({});
  });

  it('returns a stable identity when closed, so a 1s re-derive does not churn children', () => {
    expect(activeLiveScores({ g1: score() }, false)).toBe(activeLiveScores({ g2: score() }, false));
  });
});

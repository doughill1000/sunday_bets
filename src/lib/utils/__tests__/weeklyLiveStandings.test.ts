import { describe, expect, it } from 'vitest';
import { assembleWeeklyLiveStandings } from '../weeklyPicks';
import type { WeeklyGameBreakdown, WeeklyPickRow } from '$lib/types/leaderboard';
import type { LiveScoreEntry } from '$lib/live/types';

// Fixtures model one matchup: home = KC (team id 1), away = BUF (team id 2).
const HOME_ID = 1;
const AWAY_ID = 2;

function row(over: Partial<WeeklyPickRow> = {}): WeeklyPickRow {
  return {
    userId: 'u',
    displayName: 'U',
    avatarKey: null,
    isYou: false,
    pickedSide: 'home',
    pickedTeamShort: 'KC',
    weight: 'M', // 3 pts
    outcome: null,
    pointsDelta: null,
    pickedTeamId: HOME_ID,
    lockedSpreadValue: 2.5,
    lockedSpreadTeamId: HOME_ID,
    ...over
  };
}

function game(
  picks: WeeklyPickRow[],
  over: Partial<WeeklyGameBreakdown> = {}
): WeeklyGameBreakdown {
  return {
    gameId: 'g1',
    away: 'BUF',
    home: 'KC',
    homeScore: null,
    awayScore: null,
    kickoff: '2025-01-05T18:00:00Z',
    isFinal: false,
    homeTeamId: HOME_ID,
    awayTeamId: AWAY_ID,
    picks,
    ...over
  };
}

function score(
  homeScore: number,
  awayScore: number,
  status: 'in_progress' | 'final' = 'in_progress'
): LiveScoreEntry {
  return {
    homeScore,
    awayScore,
    status,
    displayClock: status === 'in_progress' ? '2:00' : null,
    period: status === 'in_progress' ? 4 : null
  };
}

describe('assembleWeeklyLiveStandings', () => {
  it('ranks a covering pick above a trailing one with the right provisional points', () => {
    // KC 21, BUF 17 with KC −2.5 → home margin +1.5. Home pick (M=3) covers → +3; away pick
    // (L=1) trails → −1.
    const alice = row({
      userId: 'a',
      displayName: 'Alice',
      pickedSide: 'home',
      pickedTeamId: HOME_ID,
      weight: 'M'
    });
    const bob = row({
      userId: 'b',
      displayName: 'Bob',
      pickedSide: 'away',
      pickedTeamShort: 'BUF',
      pickedTeamId: AWAY_ID,
      weight: 'L'
    });

    const res = assembleWeeklyLiveStandings([game([alice, bob])], { g1: score(21, 17) });

    expect(res.map((r) => r.userId)).toEqual(['a', 'b']);
    expect(res[0]).toMatchObject({ points: 3, rank: 1, decided: 1, pickCount: 1, hasLive: true });
    expect(res[1]).toMatchObject({ points: -1, rank: 2, hasLive: true });
  });

  it('scores a push at exactly zero but still counts it decided', () => {
    // KC 20, BUF 17 with KC −3 → margin exactly 0 → push.
    const alice = row({ userId: 'a', displayName: 'Alice', lockedSpreadValue: 3, weight: 'H' });
    const res = assembleWeeklyLiveStandings([game([alice])], { g1: score(20, 17) });
    expect(res[0]).toMatchObject({ points: 0, decided: 1, hasLive: true });
  });

  it('lets a graded settlement win over the live projection', () => {
    // Live would project +3, but the settled points_delta (+5) is authoritative and the row is
    // no longer "live".
    const alice = row({ userId: 'a', displayName: 'Alice', pointsDelta: 5, outcome: 'win' });
    const res = assembleWeeklyLiveStandings(
      [game([alice], { isFinal: true, homeScore: 30, awayScore: 0 })],
      { g1: score(30, 0, 'final') }
    );
    expect(res[0]).toMatchObject({ points: 5, decided: 1, hasLive: false });
  });

  it('sums graded and live across games into one week-so-far total', () => {
    const g1 = game([row({ userId: 'a', displayName: 'Alice', pointsDelta: 5, outcome: 'win' })], {
      gameId: 'g1',
      isFinal: true
    });
    const g2 = game([row({ userId: 'a', displayName: 'Alice', weight: 'M' })], { gameId: 'g2' });
    const res = assembleWeeklyLiveStandings([g1, g2], { g2: score(21, 17) });
    expect(res[0]).toMatchObject({ points: 8, decided: 2, pickCount: 2, hasLive: true });
  });

  it('counts a graded missed-pick penalty (no pick, settled points_delta)', () => {
    const missed = row({
      userId: 'a',
      displayName: 'Alice',
      pickedSide: null,
      pickedTeamShort: null,
      pickedTeamId: null,
      weight: null,
      outcome: 'missed',
      pointsDelta: -1
    });
    const res = assembleWeeklyLiveStandings([game([missed])], {});
    expect(res[0]).toMatchObject({ points: -1, decided: 1, pickCount: 0, hasLive: false });
  });

  it('yields to the graded order once every game is settled, matching an empty live map', () => {
    const bd = [
      game(
        [
          row({ userId: 'a', displayName: 'Alice', pointsDelta: 1, outcome: 'win' }),
          row({ userId: 'b', displayName: 'Bob', pointsDelta: 5, outcome: 'win' })
        ],
        { isFinal: true }
      )
    ];
    // Even with a stale live score in hand, graded wins — so the order is the settled one.
    const withStale = assembleWeeklyLiveStandings(bd, { g1: score(0, 40, 'final') });
    const graded = assembleWeeklyLiveStandings(bd, {});
    expect(graded.map((r) => [r.userId, r.points, r.rank])).toEqual([
      ['b', 5, 1],
      ['a', 1, 2]
    ]);
    expect(withStale).toEqual(graded);
  });

  it('surfaces every player, including one with no pick, at zero', () => {
    const alice = row({ userId: 'a', displayName: 'Alice', weight: 'M' }); // covering +3
    const bob = row({
      userId: 'b',
      displayName: 'Bob',
      pickedSide: null,
      pickedTeamShort: null,
      pickedTeamId: null,
      weight: null
    });
    const res = assembleWeeklyLiveStandings([game([alice, bob])], { g1: score(21, 17) });
    const bobRow = res.find((r) => r.userId === 'b')!;
    expect(bobRow).toMatchObject({ points: 0, decided: 0, pickCount: 0, rank: 2 });
  });

  it('gives tied totals the same competition rank', () => {
    const alice = row({ userId: 'a', displayName: 'Alice', pickedTeamId: HOME_ID, weight: 'M' });
    const bob = row({ userId: 'b', displayName: 'Bob', pickedTeamId: HOME_ID, weight: 'M' });
    const carol = row({
      userId: 'c',
      displayName: 'Carol',
      pickedSide: 'away',
      pickedTeamShort: 'BUF',
      pickedTeamId: AWAY_ID,
      weight: 'L'
    });
    const res = assembleWeeklyLiveStandings([game([alice, bob, carol])], { g1: score(21, 17) });
    expect(res.map((r) => [r.userId, r.rank])).toEqual([
      ['a', 1],
      ['b', 1],
      ['c', 3]
    ]);
  });

  it('projects nothing from a live game while the feed is withheld (empty map)', () => {
    // Passing {} models both a fully-settled past week and a stale feed we stop asserting.
    const alice = row({ userId: 'a', displayName: 'Alice' });
    const res = assembleWeeklyLiveStandings([game([alice])], {});
    expect(res[0]).toMatchObject({ points: 0, decided: 0, pickCount: 1, hasLive: false });
  });
});

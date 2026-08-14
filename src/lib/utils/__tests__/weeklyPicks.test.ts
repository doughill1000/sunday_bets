import { describe, expect, it } from 'vitest';
import { assembleWeeklyBreakdown, orderWeeklyBreakdown } from '../weeklyPicks';
import type { GameInputRow } from '../weeklyPicks';
import type { GroupPickEntry } from '$lib/types/picks';
import type { LeaderboardPlayer, Settlement, WeeklyGameBreakdown } from '$lib/types/leaderboard';
import type { LiveScoreEntry } from '$lib/live/types';

const GAME_ID = 'game-1';
const USER_A = 'user-a';
const USER_B = 'user-b';

function makeGame(overrides: Partial<GameInputRow> = {}): GameInputRow {
  return {
    id: GAME_ID,
    commence_time: '2025-01-05T18:00:00Z',
    final_scores: null,
    home_team_id: 1,
    away_team_id: 2,
    home: { short_name: 'KC' },
    away: { short_name: 'BUF' },
    ...overrides
  };
}

function makePlayer(id: string, name: string, avatarKey: string | null = null): LeaderboardPlayer {
  return { id, display_name: name, avatar_key: avatarKey };
}

function makePick(overrides: Partial<GroupPickEntry> = {}): GroupPickEntry {
  return {
    userId: USER_A,
    displayName: 'Alice',
    avatarKey: null,
    gameId: GAME_ID,
    pickedSide: 'home',
    weight: 'M',
    pickedTeamShort: 'KC',
    ...overrides
  };
}

function makeSettlement(overrides: Partial<Settlement> = {}): Settlement {
  return {
    user_id: USER_A,
    game_id: GAME_ID,
    outcome: 'win',
    points_delta: 3,
    ...overrides
  };
}

describe('assembleWeeklyBreakdown', () => {
  const players = [makePlayer(USER_A, 'Alice'), makePlayer(USER_B, 'Bob')];

  it('maps game metadata correctly', () => {
    const result = assembleWeeklyBreakdown([makeGame()], [], [], players, null);
    expect(result).toHaveLength(1);
    const g = result[0];
    expect(g.gameId).toBe(GAME_ID);
    expect(g.away).toBe('BUF');
    expect(g.home).toBe('KC');
    expect(g.isFinal).toBe(false);
    expect(g.homeScore).toBeNull();
    expect(g.awayScore).toBeNull();
  });

  it('sets isFinal and scores when final_scores present', () => {
    const game = makeGame({ final_scores: { home: 21, away: 17 } });
    const result = assembleWeeklyBreakdown([game], [], [], players, null);
    expect(result[0].isFinal).toBe(true);
    expect(result[0].homeScore).toBe(21);
    expect(result[0].awayScore).toBe(17);
  });

  it('merges pick data onto the correct player row', () => {
    const pick = makePick({
      userId: USER_A,
      pickedSide: 'home',
      weight: 'H',
      pickedTeamShort: 'KC'
    });
    const result = assembleWeeklyBreakdown([makeGame()], [pick], [], players, null);
    const rows = result[0].picks;
    const alice = rows.find((r) => r.userId === USER_A)!;
    const bob = rows.find((r) => r.userId === USER_B)!;

    expect(alice.pickedSide).toBe('home');
    expect(alice.weight).toBe('H');
    expect(alice.pickedTeamShort).toBe('KC');
    expect(alice.outcome).toBeNull();

    expect(bob.pickedSide).toBeNull();
    expect(bob.outcome).toBeNull();
  });

  it('merges settlement outcome and pointsDelta', () => {
    const pick = makePick();
    const settlement = makeSettlement({ outcome: 'win', points_delta: 3 });
    const result = assembleWeeklyBreakdown([makeGame()], [pick], [settlement], players, null);
    const alice = result[0].picks.find((r) => r.userId === USER_A)!;
    expect(alice.outcome).toBe('win');
    expect(alice.pointsDelta).toBe(3);
  });

  it('marks outcome=missed for players with no pick on a final game', () => {
    const game = makeGame({ final_scores: { home: 10, away: 7 } });
    const result = assembleWeeklyBreakdown([game], [], [], players, null);
    const alice = result[0].picks.find((r) => r.userId === USER_A)!;
    const bob = result[0].picks.find((r) => r.userId === USER_B)!;
    expect(alice.outcome).toBe('missed');
    expect(bob.outcome).toBe('missed');
  });

  it('does not manufacture missed for a game that kicked off before the member joined (#724)', () => {
    // ADR-0037: the Weekly grid enumerates roster x games itself, so it must carry the same
    // participation boundary the grading choke point does. Alice was there all along; Bob's
    // league/join postdates this kickoff, so grading wrote him no row and neither may the UI.
    const game = makeGame({
      commence_time: '2025-09-07T17:00:00Z',
      final_scores: { home: 10, away: 7 }
    });
    const roster = [
      { ...makePlayer(USER_A, 'Alice'), participation_start: Date.parse('2000-01-01T00:00:00Z') },
      { ...makePlayer(USER_B, 'Bob'), participation_start: Date.parse('2025-09-10T00:00:00Z') }
    ];

    const result = assembleWeeklyBreakdown([game], [], [], roster, null);
    const alice = result[0].picks.find((r) => r.userId === USER_A)!;
    const bob = result[0].picks.find((r) => r.userId === USER_B)!;

    expect(alice.outcome).toBe('missed');
    expect(bob.outcome).toBeNull();
    // #725: the pre-participation row is flagged so the grid can show a neutral "not in yet"
    // rather than folding Bob into the "No pick" list.
    expect(alice.notParticipating).toBe(false);
    expect(bob.notParticipating).toBe(true);
  });

  it('still marks missed for a game at or after the member participation start (#724)', () => {
    const game = makeGame({
      commence_time: '2025-09-14T17:00:00Z',
      final_scores: { home: 10, away: 7 }
    });
    const roster = [
      { ...makePlayer(USER_B, 'Bob'), participation_start: Date.parse('2025-09-14T17:00:00Z') }
    ];

    const result = assembleWeeklyBreakdown([game], [], [], roster, null);
    expect(result[0].picks[0].outcome).toBe('missed');
    expect(result[0].picks[0].notParticipating).toBe(false);
  });

  it('a graded settlement still wins over the boundary (pre-removal history, ADR-0037 ruling 6)', () => {
    const game = makeGame({
      commence_time: '2025-09-07T17:00:00Z',
      final_scores: { home: 10, away: 7 }
    });
    // Re-joined member: fresh joined_at postdates the game, but their pre-removal graded row
    // survives and must keep displaying.
    const roster = [
      { ...makePlayer(USER_A, 'Alice'), participation_start: Date.parse('2025-12-01T00:00:00Z') }
    ];
    const settlement = makeSettlement({ outcome: 'missed', points_delta: -1 });

    const result = assembleWeeklyBreakdown([game], [], [settlement], roster, null);
    expect(result[0].picks[0].outcome).toBe('missed');
    expect(result[0].picks[0].pointsDelta).toBe(-1);
    // A graded row means they did participate — never flagged "not in yet".
    expect(result[0].picks[0].notParticipating).toBe(false);
  });

  it('does not mark missed for no-pick on an in-progress game', () => {
    const result = assembleWeeklyBreakdown([makeGame()], [], [], players, null);
    expect(result[0].picks[0].outcome).toBeNull();
  });

  it('marks isYou=true only for the current user', () => {
    const result = assembleWeeklyBreakdown([makeGame()], [], [], players, USER_A);
    const alice = result[0].picks.find((r) => r.userId === USER_A)!;
    const bob = result[0].picks.find((r) => r.userId === USER_B)!;
    expect(alice.isYou).toBe(true);
    expect(bob.isYou).toBe(false);
  });

  it('threads avatarKey from the player onto each row', () => {
    const withAvatars = [makePlayer(USER_A, 'Alice', 'preset-1'), makePlayer(USER_B, 'Bob', null)];
    const result = assembleWeeklyBreakdown([makeGame()], [], [], withAvatars, null);
    const alice = result[0].picks.find((r) => r.userId === USER_A)!;
    const bob = result[0].picks.find((r) => r.userId === USER_B)!;
    expect(alice.avatarKey).toBe('preset-1');
    expect(bob.avatarKey).toBeNull();
  });

  it('returns one row per player per game', () => {
    const result = assembleWeeklyBreakdown([makeGame()], [], [], players, null);
    expect(result[0].picks).toHaveLength(2);
  });

  it('threads raw home/away team ids onto the game breakdown (#584)', () => {
    const game = makeGame({ home_team_id: 10, away_team_id: 20 });
    const result = assembleWeeklyBreakdown([game], [], [], players, null);
    expect(result[0].homeTeamId).toBe(10);
    expect(result[0].awayTeamId).toBe(20);
  });

  it('threads the frozen-at-lock cover inputs from the pick; null on a no-pick row (#584)', () => {
    const pick = makePick({
      userId: USER_A,
      pickedTeamId: 1,
      lockedSpreadValue: -2.5,
      lockedSpreadTeamId: 1
    });
    const result = assembleWeeklyBreakdown([makeGame()], [pick], [], players, null);
    const alice = result[0].picks.find((r) => r.userId === USER_A)!;
    const bob = result[0].picks.find((r) => r.userId === USER_B)!;

    expect(alice.pickedTeamId).toBe(1);
    expect(alice.lockedSpreadValue).toBe(-2.5);
    expect(alice.lockedSpreadTeamId).toBe(1);

    expect(bob.pickedTeamId).toBeNull();
    expect(bob.lockedSpreadValue).toBeNull();
    expect(bob.lockedSpreadTeamId).toBeNull();
  });

  it('returns empty array when no games', () => {
    const result = assembleWeeklyBreakdown([], [], [], players, null);
    expect(result).toHaveLength(0);
  });
});

function makeBreakdownGame(overrides: Partial<WeeklyGameBreakdown> = {}): WeeklyGameBreakdown {
  return {
    gameId: 'g1',
    away: 'BUF',
    home: 'KC',
    homeScore: null,
    awayScore: null,
    kickoff: '2025-09-07T17:00:00Z',
    isFinal: false,
    homeTeamId: 1,
    awayTeamId: 2,
    picks: [],
    ...overrides
  };
}

function liveScore(overrides: Partial<LiveScoreEntry> = {}): LiveScoreEntry {
  return {
    homeScore: 10,
    awayScore: 7,
    status: 'in_progress',
    displayClock: '5:00',
    period: 2,
    ...overrides
  };
}

describe('orderWeeklyBreakdown', () => {
  // The regression the acceptance criteria call out by name: with zero live games the order
  // must be byte-identical to today's kickoff-ascending order, no mode flag involved.
  it('with zero live games, order is unchanged — kickoff ascending', () => {
    const early = makeBreakdownGame({ gameId: 'early', kickoff: '2025-09-07T17:00:00Z' });
    const late = makeBreakdownGame({ gameId: 'late', kickoff: '2025-09-07T20:25:00Z' });
    const result = orderWeeklyBreakdown([late, early], {});
    expect(result.map((g) => g.gameId)).toEqual(['early', 'late']);
  });

  it('with one live game, it leads every final and every not-yet-started game', () => {
    const final = makeBreakdownGame({
      gameId: 'final',
      kickoff: '2025-09-07T17:00:00Z',
      isFinal: true
    });
    const live = makeBreakdownGame({ gameId: 'live', kickoff: '2025-09-07T20:25:00Z' });
    const upcoming = makeBreakdownGame({ gameId: 'upcoming', kickoff: '2025-09-08T00:20:00Z' });

    const result = orderWeeklyBreakdown([final, live, upcoming], { live: liveScore() });
    expect(result.map((g) => g.gameId)).toEqual(['live', 'final', 'upcoming']);
  });

  it('with N live games, they lead together and keep kickoff order among themselves', () => {
    const finalGame = makeBreakdownGame({
      gameId: 'final',
      kickoff: '2025-09-07T17:00:00Z',
      isFinal: true
    });
    const liveLate = makeBreakdownGame({ gameId: 'live-late', kickoff: '2025-09-07T20:25:00Z' });
    const liveEarly = makeBreakdownGame({ gameId: 'live-early', kickoff: '2025-09-07T17:00:00Z' });

    const result = orderWeeklyBreakdown([finalGame, liveLate, liveEarly], {
      'live-late': liveScore(),
      'live-early': liveScore()
    });
    expect(result.map((g) => g.gameId)).toEqual(['live-early', 'live-late', 'final']);
  });

  // A `final` live-feed entry (unofficial, not yet graded) is not "in play" for ordering
  // purposes — only `in_progress` earns the top slot.
  it('does not promote a final-but-ungraded live entry above kickoff order', () => {
    const early = makeBreakdownGame({ gameId: 'early', kickoff: '2025-09-07T17:00:00Z' });
    const unofficial = makeBreakdownGame({ gameId: 'unofficial', kickoff: '2025-09-07T20:25:00Z' });

    const result = orderWeeklyBreakdown([unofficial, early], {
      unofficial: liveScore({ status: 'final' })
    });
    expect(result.map((g) => g.gameId)).toEqual(['early', 'unofficial']);
  });
});

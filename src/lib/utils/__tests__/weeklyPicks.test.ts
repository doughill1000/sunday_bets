import { describe, expect, it } from 'vitest';
import { assembleWeeklyBreakdown } from '../weeklyPicks';
import type { GameInputRow } from '../weeklyPicks';
import type { GroupPickEntry } from '$lib/types/picks';
import type { LeaderboardPlayer, Settlement } from '$lib/types/leaderboard';

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

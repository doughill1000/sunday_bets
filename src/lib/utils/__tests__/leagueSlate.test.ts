import { describe, it, expect } from 'vitest';
import { buildSlateGames } from '../leagueSlate';
import type { PickGame } from '$lib/types/games';
import type { LeagueSituationalRecord } from '$lib/types/server/league';

const NOW = Date.parse('2026-09-13T12:00:00Z');

function game(overrides: Partial<PickGame> = {}): PickGame {
  return {
    id: 'g',
    kickoff: '2026-09-13T18:00:00Z', // after NOW → upcoming by default
    home: 'Home',
    away: 'Away',
    homeTeamId: 1,
    awayTeamId: 2,
    spreadTeamId: 1,
    spreadValue: -7,
    ...overrides
  };
}

// Team 1 (home favorite) and Team 2 (away underdog) both have a qualifying quadrant.
const situational: LeagueSituationalRecord[] = [
  { teamId: 1, isHome: true, isFavorite: true, games: 8, ats: { wins: 6, losses: 2, pushes: 0 } },
  { teamId: 2, isHome: false, isFavorite: false, games: 5, ats: { wins: 2, losses: 2, pushes: 1 } }
];

describe('buildSlateGames', () => {
  it('drops games that have already kicked off', () => {
    const games = [
      game({ id: 'past', kickoff: '2026-09-13T06:00:00Z' }),
      game({ id: 'future', kickoff: '2026-09-13T20:00:00Z' })
    ];
    const slate = buildSlateGames(games, situational, NOW);
    expect(slate.map((g) => g.gameId)).toEqual(['future']);
  });

  it('orders upcoming games soonest first', () => {
    const games = [
      game({ id: 'late', kickoff: '2026-09-13T23:00:00Z' }),
      game({ id: 'early', kickoff: '2026-09-13T17:00:00Z' }),
      game({ id: 'mid', kickoff: '2026-09-13T20:00:00Z' })
    ];
    const slate = buildSlateGames(games, situational, NOW);
    expect(slate.map((g) => g.gameId)).toEqual(['early', 'mid', 'late']);
  });

  it('annotates each side with its matching situational quadrant', () => {
    const [g] = buildSlateGames([game({ id: 'g1' })], situational, NOW);
    expect(g.away).toEqual({
      label: 'Away',
      nugget: {
        text: '2-2-1 ATS as away underdog',
        record: '2-2-1',
        role: 'away underdog',
        games: 5
      }
    });
    expect(g.home).toEqual({
      label: 'Home',
      nugget: { text: '6-2 ATS as home favorite', record: '6-2', role: 'home favorite', games: 8 }
    });
  });

  it('leaves a side null when its quadrant is missing, thin, or a pick’em', () => {
    // Pick'em → neither side has a favorite/underdog quadrant.
    const [pk] = buildSlateGames([game({ id: 'pk', spreadValue: 0 })], situational, NOW);
    expect(pk.home.nugget).toBeNull();
    expect(pk.away.nugget).toBeNull();

    // Home team has no situational row at all.
    const [g] = buildSlateGames(
      [game({ id: 'g2', homeTeamId: 99, spreadTeamId: 99 })],
      situational,
      NOW
    );
    expect(g.home.nugget).toBeNull();
    // The away underdog still resolves.
    expect(g.away.nugget?.games).toBe(5);
  });

  it('returns an empty slate when nothing is upcoming', () => {
    const games = [game({ id: 'past', kickoff: '2026-09-13T06:00:00Z' })];
    expect(buildSlateGames(games, situational, NOW)).toEqual([]);
  });

  describe('divisional tag (#692)', () => {
    // Same-conference-and-division = divisional, mirroring league_ats_divisional's rule.
    const divisions = new Map([
      [1, 'AFC North'],
      [2, 'AFC North'],
      [3, 'NFC North']
    ]);

    it('marks a same-conference-and-division matchup', () => {
      const [g] = buildSlateGames([game({ id: 'g1' })], situational, NOW, divisions);
      expect(g.isDivisional).toBe(true);
    });

    it('does not mark a cross-division matchup', () => {
      const [g] = buildSlateGames(
        [game({ id: 'g2', awayTeamId: 3, spreadTeamId: 1 })],
        situational,
        NOW,
        divisions
      );
      expect(g.isDivisional).toBe(false);
    });

    it('never marks a matchup when a team is missing from the division map', () => {
      // Team 99 has no division identity (e.g. a non-NFL team with null columns).
      const [g] = buildSlateGames(
        [game({ id: 'g3', awayTeamId: 99, spreadTeamId: 1 })],
        situational,
        NOW,
        divisions
      );
      expect(g.isDivisional).toBe(false);

      // And with no map at all (the default), nothing is ever divisional.
      const [bare] = buildSlateGames([game({ id: 'g4' })], situational, NOW);
      expect(bare.isDivisional).toBe(false);
    });
  });
});

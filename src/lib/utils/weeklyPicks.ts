import type {
  WeeklyGameBreakdown,
  WeeklyPickRow,
  LeaderboardPlayer,
  Settlement
} from '$lib/types/leaderboard';
import type { GroupPickEntry } from '$lib/types/picks';

export type GameInputRow = {
  id: string;
  commence_time: string;
  final_scores: { home: number; away: number } | null;
  home: { short_name: string } | null;
  away: { short_name: string } | null;
};

export function assembleWeeklyBreakdown(
  games: GameInputRow[],
  groupPicks: GroupPickEntry[],
  settlements: Settlement[],
  players: LeaderboardPlayer[],
  currentUserId: string | null
): WeeklyGameBreakdown[] {
  const picksByGameUser = new Map<string, GroupPickEntry>();
  for (const pick of groupPicks) {
    picksByGameUser.set(`${pick.gameId}:${pick.userId}`, pick);
  }

  const settlementsByGameUser = new Map<string, Settlement>();
  for (const s of settlements) {
    settlementsByGameUser.set(`${s.game_id}:${s.user_id}`, s);
  }

  return games.map((game) => {
    const scores = game.final_scores;
    const isFinal = scores != null;

    const picks: WeeklyPickRow[] = players.map((player) => {
      const pick = picksByGameUser.get(`${game.id}:${player.id}`);
      const settlement = settlementsByGameUser.get(`${game.id}:${player.id}`);

      let outcome: WeeklyPickRow['outcome'] = null;
      if (settlement) {
        outcome = settlement.outcome;
      } else if (!pick && isFinal) {
        outcome = 'missed';
      }

      return {
        userId: player.id,
        displayName: player.display_name,
        avatarKey: player.avatar_key ?? null,
        isYou: player.id === currentUserId,
        pickedSide: pick?.pickedSide ?? null,
        pickedTeamShort: pick?.pickedTeamShort ?? null,
        weight: pick?.weight ?? null,
        outcome,
        pointsDelta: settlement?.points_delta ?? null
      };
    });

    return {
      gameId: game.id,
      away: game.away?.short_name ?? '',
      home: game.home?.short_name ?? '',
      homeScore: scores?.home ?? null,
      awayScore: scores?.away ?? null,
      kickoff: game.commence_time,
      isFinal,
      picks
    };
  });
}

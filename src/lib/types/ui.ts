import type { TeamSide, WeightCode } from './domain';

export type UIGame = {
  id: string;
  kickoff: string;
  home: string; // abbrev
  away: string; // abbrev
  homeTeamId: number | null;
  awayTeamId: number | null;
  spreadTeamId: number | null;
  spreadValue: number | null; // 0 => PK
};

export type GameDTO = {
  id: string; // games.id (uuid)
  commenceTime: string; // ISO
  status: string;
  home: { id: number; name: string; shortName: string }; // teams are bigserial -> number
  away: { id: number; name: string; shortName: string };
  line: {
    spreadTeamId: number | null; // teams.id (bigint -> number)
    spreadValue: number | null;
    fetchedAt: string | null;
  };
  started: boolean;
  picks: Array<{
    userId: string; // users.id (uuid)
    displayName: string;
    pickedTeamId: number | null; // teams.id
    weight: WeightCode | null;
    lockedAt: string | null;
    isMe: boolean;
  }>;
};

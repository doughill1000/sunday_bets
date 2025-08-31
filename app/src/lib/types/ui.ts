import type { WeightCode } from "./domain";

export type UIGame = {
  id: string;
  kickoff: string;
  away: string;
  home: string;
  spreadTeam: 'home' | 'away';
  spread: string;
};

export type GameDTO = {
  id: string;                           // games.id (uuid)
  commenceTime: string;                 // ISO
  status: string;
  home: { id: number; name: string; shortName: string }; // teams are bigserial -> number
  away: { id: number; name: string; shortName: string };
  line: {
    spreadTeamId: number | null;        // teams.id (bigint -> number)
    spreadValue: string | null;
    fetchedAt: string | null;
  };
  started: boolean;
  picks: Array<{
    userId: string;                     // users.id (uuid)
    displayName: string;
    pickedTeamId: number | null;        // teams.id
    weight: WeightCode | null;
    lockedAt: string | null;
    isMe: boolean;
  }>;
};

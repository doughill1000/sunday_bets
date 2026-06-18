import type { WeightCode } from './domain';

/** Game shape rendered by the picks UI. */
export type PickGame = {
  id: string;
  kickoff: string;
  home: string;
  away: string;
  homeTeamId: number | null;
  awayTeamId: number | null;
  spreadTeamId: number | null;
  spreadValue: number | null;
};

/** Game response returned by the week-games endpoint. */
export type WeekGame = {
  id: string;
  commenceTime: string;
  status: string;
  home: { id: number; name: string; shortName: string };
  away: { id: number; name: string; shortName: string };
  line: {
    spreadTeamId: number | null;
    spreadValue: number | null;
    source: string | null;
    fetchedAt: string | null;
  };
  started: boolean;
  picks: Array<{
    userId: string;
    displayName: string;
    pickedTeamId: number | null;
    weight: WeightCode | null;
    lockedAt: string | null;
    isMe: boolean;
  }>;
};

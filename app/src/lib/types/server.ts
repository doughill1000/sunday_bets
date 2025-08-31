import type { TeamSide, WeightCode } from "./domain";

// Minimal, DB-agnostic shape your Odds adapter needs
export type WeekWindow = {
  startTs: string;     // ISO
  endTs: string;       // ISO
  weekNumber: number;  // negative for preseason if you do that
  id?: number;          // optional, handy in callers
};


export type ServerGame = {
  gameId: string;
  externalGameId: string | null;
  kickoff: string; // timestamptz → ISO string
  homeCode: string;
  homeName: string;
  awayCode: string;
  awayName: string;
  spreadTeam: 'home' | 'away' | null;
  spreadValue: string;
  lineSource: string | null;
};


export type WeekRow = {
  id: number;
  startTs: string;
  endTs: string;
  weekNumber: number
};

export type TeamRow = {
  id: number;
  short_name: string;
};

export type OddsGame = {
  id: string;
  commence_time: string;
  home_team: string;
  away_team: string;
};

export type PickState = { team: TeamSide; weight: WeightCode };
export type PickEntry = {
  selected?: PickState;
  lockedPick?: PickState;
  lockedAt?: string;
  unlocksUsed?: number;
};

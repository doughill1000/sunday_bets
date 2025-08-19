import type { WeightCode } from "./domain";

// Minimal, DB-agnostic shape your Odds adapter needs
export type WeekWindow = {
  start_ts: string;     // ISO
  end_ts: string;       // ISO
  week_number: number;  // negative for preseason if you do that
  id?: number;          // optional, handy in callers
};

type OddsApiBookmaker = {
  key: string;
  title: string;
  last_update: string;
  markets: Array<{
    key: string; // e.g. "spreads"
    last_update: string;
    outcomes: Array<{
      name: string;   // team name
      price: number;  // odds (e.g. -110)
      point: number;  // spread value (e.g. -3.5)
    }>;
  }>;
};

export type OddsApiGame = {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsApiBookmaker[];
};

export type ServerGame = {
  game_id: string;
  external_game_id: string | null;
  kickoff: string; // timestamptz → ISO string
  home_code: string;
  home_name: string;
  away_code: string;
  away_name: string;
  spread_team: 'home' | 'away' | null;
  spread_value: number | null;
  line_source: string | null;
};

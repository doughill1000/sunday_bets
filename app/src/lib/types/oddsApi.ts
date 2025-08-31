type OddsBookmaker = {
  key: string;
  title?: string;
  last_update?: string;
  markets: Array<{
    key: string;
    last_update?: string;
    outcomes: Array<{
      name: string;
      price?: number;
      point: number;
    }>;
  }>;
};

export type OddsGame = {
  id: string;
  sport_key?: string;
  sport_title?: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsBookmaker[];
};
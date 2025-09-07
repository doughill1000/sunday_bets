export type WeightCode = 'L' | 'M' | 'H' | 'A';
export type Id = string & { readonly brand: unique symbol }; // if you like branded IDs
export interface Team {
  id: string;
  name: string;
  shortName: string;
}
export type TeamSide = 'away' | 'home';
export interface Line {
  spreadTeamId: string | null;
  spreadValue: number | null;
  fetchedAt: string | null;
}

export const WEIGHTS: Record<WeightCode, { label: string; points: number }> = {
  L: { label: 'Low', points: 1 },
  M: { label: 'Medium', points: 3 },
  H: { label: 'High', points: 5 },
  A: { label: 'All-In', points: 10 }
};

export type TeamMeta = {
  id: number;
  name: string;
  short: string;
  colors: [string, string];
};

// Keyed by team short code (external_key)
export const TEAM_META: Record<string, TeamMeta> = {
  ARI: { id: 1, name: 'Arizona Cardinals', short: 'ARI', colors: ['#97233F', '#000000'] },
  ATL: { id: 2, name: 'Atlanta Falcons', short: 'ATL', colors: ['#A71930', '#000000'] },
  BAL: { id: 3, name: 'Baltimore Ravens', short: 'BAL', colors: ['#241773', '#9E7C0C'] },
  BUF: { id: 4, name: 'Buffalo Bills', short: 'BUF', colors: ['#00338D', '#C60C30'] },
  CAR: { id: 5, name: 'Carolina Panthers', short: 'CAR', colors: ['#0085CA', '#101820'] },
  CHI: { id: 6, name: 'Chicago Bears', short: 'CHI', colors: ['#0B162A', '#C83803'] },
  CIN: { id: 7, name: 'Cincinnati Bengals', short: 'CIN', colors: ['#FB4F14', '#000000'] },
  CLE: { id: 8, name: 'Cleveland Browns', short: 'CLE', colors: ['#311D00', '#FF3C00'] },
  DAL: { id: 9, name: 'Dallas Cowboys', short: 'DAL', colors: ['#041E42', '#869397'] },
  DEN: { id: 10, name: 'Denver Broncos', short: 'DEN', colors: ['#002244', '#FB4F14'] },
  DET: { id: 11, name: 'Detroit Lions', short: 'DET', colors: ['#0076B6', '#B0B7BC'] },
  GB: { id: 12, name: 'Green Bay Packers', short: 'GB', colors: ['#203731', '#FFB612'] },
  HOU: { id: 13, name: 'Houston Texans', short: 'HOU', colors: ['#03202F', '#A71930'] },
  IND: { id: 14, name: 'Indianapolis Colts', short: 'IND', colors: ['#002C5F', '#A2AAAD'] },
  JAX: { id: 15, name: 'Jacksonville Jaguars', short: 'JAX', colors: ['#006778', '#101820'] },
  KC: { id: 16, name: 'Kansas City Chiefs', short: 'KC', colors: ['#E31837', '#FFB81C'] },
  LV: { id: 17, name: 'Las Vegas Raiders', short: 'LV', colors: ['#000000', '#A5ACAF'] },
  LAC: { id: 18, name: 'Los Angeles Chargers', short: 'LAC', colors: ['#0080C6', '#FFC20E'] },
  LAR: { id: 19, name: 'Los Angeles Rams', short: 'LAR', colors: ['#003594', '#FFA300'] },
  MIA: { id: 20, name: 'Miami Dolphins', short: 'MIA', colors: ['#008E97', '#F58220'] },
  MIN: { id: 21, name: 'Minnesota Vikings', short: 'MIN', colors: ['#4F2683', '#FFC62F'] },
  NE: { id: 22, name: 'New England Patriots', short: 'NE', colors: ['#002244', '#C60C30'] },
  NO: { id: 23, name: 'New Orleans Saints', short: 'NO', colors: ['#D3BC8D', '#101820'] },
  NYG: { id: 24, name: 'New York Giants', short: 'NYG', colors: ['#0B2265', '#A71930'] },
  NYJ: { id: 25, name: 'New York Jets', short: 'NYJ', colors: ['#125740', '#FFFFFF'] },
  PHI: { id: 26, name: 'Philadelphia Eagles', short: 'PHI', colors: ['#004C54', '#A5ACAF'] },
  PIT: { id: 27, name: 'Pittsburgh Steelers', short: 'PIT', colors: ['#101820', '#FFB612'] },
  SF: { id: 28, name: 'San Francisco 49ers', short: 'SF', colors: ['#AA0000', '#B3995D'] },
  SEA: { id: 29, name: 'Seattle Seahawks', short: 'SEA', colors: ['#002244', '#69BE28'] },
  TB: { id: 30, name: 'Tampa Bay Buccaneers', short: 'TB', colors: ['#D50A0A', '#34302B'] },
  TEN: { id: 31, name: 'Tennessee Titans', short: 'TEN', colors: ['#0C2340', '#4B92DB'] },
  WAS: { id: 32, name: 'Washington Commanders', short: 'WAS', colors: ['#5A1414', '#FFB612'] }
};

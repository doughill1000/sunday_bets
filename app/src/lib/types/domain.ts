export type WeightCode = 'L' | 'M' | 'H' | 'A';
export type Id = string & { readonly brand: unique symbol }; // if you like branded IDs
export interface Team { id: string; name: string; shortName: string }
export interface Line { spreadTeamId: string | null; spreadValue: number | null; fetchedAt: string | null }

export const WEIGHTS: Record<WeightCode, { label: string; points: number }> = {
  L: { label: 'Low',     points: 1 },
  M: { label: 'Medium',  points: 3 },
  H: { label: 'High',    points: 5 },
  A: { label: 'All-In',  points: 10 }
};

export type TeamMeta = { name: string; colors: [string, string] };

export const TEAM_META: Record<string, TeamMeta> = {
  ARI: { name: 'Arizona Cardinals',        colors: ['#97233F', '#000000'] },
  ATL: { name: 'Atlanta Falcons',          colors: ['#A71930', '#000000'] },
  BAL: { name: 'Baltimore Ravens',         colors: ['#241773', '#9E7C0C'] },
  BUF: { name: 'Buffalo Bills',            colors: ['#00338D', '#C60C30'] },
  CAR: { name: 'Carolina Panthers',        colors: ['#0085CA', '#101820'] },
  CHI: { name: 'Chicago Bears',            colors: ['#0B162A', '#C83803'] },
  CIN: { name: 'Cincinnati Bengals',       colors: ['#FB4F14', '#000000'] },
  CLE: { name: 'Cleveland Browns',         colors: ['#311D00', '#FF3C00'] },
  DAL: { name: 'Dallas Cowboys',           colors: ['#041E42', '#869397'] },
  DEN: { name: 'Denver Broncos',           colors: ['#002244', '#FB4F14'] },
  DET: { name: 'Detroit Lions',            colors: ['#0076B6', '#B0B7BC'] },
  GB:  { name: 'Green Bay Packers',        colors: ['#203731', '#FFB612'] },
  HOU: { name: 'Houston Texans',           colors: ['#03202F', '#A71930'] },
  IND: { name: 'Indianapolis Colts',       colors: ['#002C5F', '#A2AAAD'] },
  JAX: { name: 'Jacksonville Jaguars',     colors: ['#006778', '#101820'] },
  KC:  { name: 'Kansas City Chiefs',       colors: ['#E31837', '#FFB81C'] },
  LV:  { name: 'Las Vegas Raiders',        colors: ['#000000', '#A5ACAF'] },
  LAC: { name: 'Los Angeles Chargers',     colors: ['#0080C6', '#FFC20E'] },
  LAR: { name: 'Los Angeles Rams',         colors: ['#003594', '#FFA300'] },
  MIA: { name: 'Miami Dolphins',           colors: ['#008E97', '#F58220'] },
  MIN: { name: 'Minnesota Vikings',        colors: ['#4F2683', '#FFC62F'] },
  NE:  { name: 'New England Patriots',     colors: ['#002244', '#C60C30'] },
  NO:  { name: 'New Orleans Saints',       colors: ['#D3BC8D', '#101820'] },
  NYG: { name: 'New York Giants',          colors: ['#0B2265', '#A71930'] },
  NYJ: { name: 'New York Jets',            colors: ['#125740', '#FFFFFF'] },
  PHI: { name: 'Philadelphia Eagles',      colors: ['#004C54', '#A5ACAF'] },
  PIT: { name: 'Pittsburgh Steelers',      colors: ['#101820', '#FFB612'] },
  SF:  { name: 'San Francisco 49ers',      colors: ['#AA0000', '#B3995D'] },
  SEA: { name: 'Seattle Seahawks',         colors: ['#002244', '#69BE28'] },
  TB:  { name: 'Tampa Bay Buccaneers',     colors: ['#D50A0A', '#34302B'] },
  TEN: { name: 'Tennessee Titans',         colors: ['#0C2340', '#4B92DB'] },
  WAS: { name: 'Washington Commanders',    colors: ['#5A1414', '#FFB612'] }
};

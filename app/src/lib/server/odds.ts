import { ODDS_API_KEY, ODDS_API_BASE } from '$env/static/private';

type OddsGame = {
  id: string;                      // external_game_id
  commence_time: string;           // ISO
  home_team: string;               // full team name
  away_team: string;
  bookmakers: Array<{
    key: string;                   // "barstool"
    markets: Array<{
      key: string;                 // "spreads"
      outcomes: Array<{ name: string; point: number }>; // [{name:"PHI", point:-1.5}, ...]
    }>;
  }>;
};

export async function fetchNFLSpreadsForWeek(weekStartISO: string, weekEndISO: string) {
  // Odds API doesn’t have a “week” param; we bound by dates and pick the book + market we want.
  const params = new URLSearchParams({
    apiKey: ODDS_API_KEY,
    sport: 'americanfootball_nfl',
    regions: 'us',
    markets: 'spreads',
    oddsFormat: 'american',
    dateFormat: 'iso',
    bookmakers: 'barstool',
    // Filter by time window (inclusive)
    commenceTimeFrom: weekStartISO,
    commenceTimeTo: weekEndISO
  });

  const url = `${ODDS_API_BASE}/sports/americanfootball_nfl/odds?${params.toString()}`;
  const res = await fetch(url, { headers: { 'cache-control': 'no-store' } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Odds API ${res.status}: ${text}`);
  }
  const games = (await res.json()) as OddsGame[];
  return games;
}

export function extractBarstoolSpread(g: OddsGame) {
  const barstool = g.bookmakers.find(b => b.key === 'barstool');
  if (!barstool) return null;
  const spreads = barstool.markets.find(m => m.key === 'spreads');
  if (!spreads) return null;

  // outcomes like [{name:"PHI", point:-1.5}, {name:"DAL", point:1.5}]
  const [a, b] = spreads.outcomes;
  if (!a || !b) return null;

  // Pick which side is “spread team” by the negative point (favored)
  const favored = [a, b].find(o => typeof o.point === 'number' && o.point < 0) ?? a;
  const spreadTeamName = favored.name;
  const spreadValue = Math.abs(favored.point); // we store +1.5; display team -1.5 later

  return { spreadTeamName, spreadValue };
}

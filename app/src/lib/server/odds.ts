// lib/server/odds.ts
import { ODDS_API_KEY1, ODDS_API_KEY2 } from '$env/static/private';
import { PUBLIC_ODDS_API_BASE } from '$env/static/public';
import type { WeekWindow } from '$lib/types/server';
import { isoNoMs } from '$lib/utils/dates';
import type { OddsGame, OddsScore } from '../types/oddsApi';

const API_KEYS = [ODDS_API_KEY1!, ODDS_API_KEY2!];
let keyIndex = 0;
function getNextApiKey() {
  const key = API_KEYS[keyIndex];
  keyIndex = (keyIndex + 1) % API_KEYS.length;
  return key;
}

function sportKeyForWeek(week: WeekWindow) {
  return week.weekNumber < 0 ? 'americanfootball_nfl_preseason' : 'americanfootball_nfl';
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export async function fetchNFLSpreadsForWeek(week: WeekWindow): Promise<OddsGame[]> {
  const sport = sportKeyForWeek(week);
  const params = new URLSearchParams({
    apiKey: getNextApiKey(),
    regions: 'us',
    markets: 'spreads',
    oddsFormat: 'american',
    dateFormat: 'iso',
    commenceTimeFrom: isoNoMs(new Date(week.startTs)),
    commenceTimeTo: isoNoMs(addDays(new Date(week.endTs), 1))
  });

  const url = `${PUBLIC_ODDS_API_BASE}/sports/${sport}/odds?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Odds API ${res.status}: ${text}`);
  }
  return res.json();
}

// NEW: fetch scores/finals (use daysFrom=1 for same-day, 3 for backfill)
export async function fetchNFLScores(daysFrom = 1): Promise<OddsScore[]> {
  const params = new URLSearchParams({
    apiKey: getNextApiKey(),
    daysFrom: String(daysFrom),
  });

  const url = `${PUBLIC_ODDS_API_BASE}/sports/americanfootball_nfl/scores?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Odds API scores ${res.status}: ${text}`);
  }
  return res.json();
}

export function extractFanduelSpread(g: OddsGame) {
  const fanduel = g.bookmakers.find((b) => b.key === 'fanduel');
  if (!fanduel) return null;
  const spreads = fanduel.markets.find((m) => m.key === 'spreads');
  if (!spreads) return null;

  const [a, b] = spreads.outcomes;
  if (!a || !b) return null;

  const favored =
    [a, b].find((o) => typeof o.point === 'number' && o.point < 0) ?? a;

  const spreadTeamName = favored.name;
  const spreadValue = Math.abs(favored.point);

  return { spreadTeamName, spreadValue };
}

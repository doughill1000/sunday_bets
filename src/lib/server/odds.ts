// lib/server/odds.ts
import { env } from '$env/dynamic/private';
import { PUBLIC_ODDS_API_BASE } from '$env/static/public';
import type { WeekWindow } from '$lib/types/server';
import { isoNoMs } from '$lib/utils/dates';
import type { OddsGame, OddsScore } from '../types/oddsApi';

// Keys are read from the runtime environment ($env/dynamic) at call time, not
// inlined at build time, so the CI `vercel build` does not require them. See
// ADR-0010 / src/lib/supabase/service.ts.
let keyIndex = 0;
function getNextApiKey(): string {
  const apiKeys = [env.ODDS_API_KEY1, env.ODDS_API_KEY2];
  const key = apiKeys[keyIndex] ?? '';
  keyIndex = (keyIndex + 1) % apiKeys.length;
  return key;
}

// Usage telemetry must never break a sync: tolerate missing headers
// (mocked fetches) and an unreachable settings table.
async function recordUsage(res: Response) {
  try {
    const raw = Number(res.headers?.get('x-requests-last') ?? '1');
    const cost = Number.isFinite(raw) && raw > 0 ? raw : 1;
    const { recordOddsApiUsage } = await import('./settings');
    await recordOddsApiUsage(cost);
  } catch {
    // ignore
  }
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
  await recordUsage(res);
  return res.json();
}

// NEW: fetch scores/finals (use daysFrom=1 for same-day, 3 for backfill)
export async function fetchNFLScores(daysFrom = 1): Promise<OddsScore[]> {
  const params = new URLSearchParams({
    apiKey: getNextApiKey(),
    daysFrom: String(daysFrom)
  });

  const url = `${PUBLIC_ODDS_API_BASE}/sports/americanfootball_nfl/scores?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Odds API scores ${res.status}: ${text}`);
  }
  await recordUsage(res);
  return res.json();
}

export function extractFanduelSpread(g: OddsGame) {
  const fanduel = g.bookmakers.find((b) => b.key === 'fanduel');
  if (!fanduel) return null;
  const spreads = fanduel.markets.find((m) => m.key === 'spreads');
  if (!spreads) return null;

  const [a, b] = spreads.outcomes;
  if (!a || !b) return null;

  const favored = [a, b].find((o) => typeof o.point === 'number' && o.point < 0) ?? a;

  const spreadTeamName = favored.name;
  const spreadValue = Math.abs(favored.point);

  return { spreadTeamName, spreadValue };
}

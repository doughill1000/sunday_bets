import { z } from 'zod';

const ESPN_SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

export const NFL_REGULAR_SEASON_WEEKS = 18;

// ---------------------------------------------------------------------------
// Zod schemas — catch ESPN schema drift before any DB write
// ---------------------------------------------------------------------------
const EspnTeamSchema = z.object({
  abbreviation: z.string(),
  displayName: z.string()
});

const EspnCompetitorSchema = z.object({
  homeAway: z.enum(['home', 'away']),
  team: EspnTeamSchema
});

const EspnStatusTypeSchema = z.object({
  state: z.string(),
  completed: z.boolean()
});

const EspnCompetitionSchema = z.object({
  competitors: z.array(EspnCompetitorSchema).min(2),
  status: z.object({ type: EspnStatusTypeSchema }).optional()
});

const EspnEventSchema = z.object({
  id: z.string(),
  date: z.string(),
  competitions: z.array(EspnCompetitionSchema).min(1)
});

const EspnScoreboardSchema = z.object({
  week: z.object({ number: z.number() }),
  events: z.array(EspnEventSchema).default([])
});

// ---------------------------------------------------------------------------
// Exported types
// ---------------------------------------------------------------------------
export type EspnGame = {
  scheduleGameId: string;
  date: string;
  homeTeamAbbr: string;
  awayTeamAbbr: string;
  status: 'scheduled' | 'in_progress' | 'final' | 'postponed';
};

export type EspnWeekResult = {
  weekNumber: number;
  games: EspnGame[];
};

export class EspnFetchError extends Error {}
export class EspnParseError extends Error {}

// ---------------------------------------------------------------------------
// Known ESPN abbreviation overrides → our teams.external_key values
// ---------------------------------------------------------------------------
const ESPN_ABBR_MAP: Record<string, string> = {
  WSH: 'WAS',
  JAC: 'JAX'
};

function normalizeAbbr(abbr: string): string {
  return ESPN_ABBR_MAP[abbr] ?? abbr;
}

function mapStatus(state: string, completed: boolean): EspnGame['status'] {
  if (completed) return 'final';
  if (state === 'in') return 'in_progress';
  // ESPN uses 'post' for both finished and postponed/cancelled games.
  // The completed guard above handles the normal finished case; reaching here
  // means the game entered post-state without completing (postponed/cancelled).
  if (state === 'post') return 'postponed';
  return 'scheduled';
}

// ---------------------------------------------------------------------------
// Fetch one week's scoreboard from the ESPN public endpoint.
// Throws EspnFetchError on network failure, EspnParseError on schema mismatch.
// Both are non-fatal from the caller's perspective (logged to Sentry, no DB write).
// ---------------------------------------------------------------------------
export async function fetchEspnWeek(year: number, weekNumber: number): Promise<EspnWeekResult> {
  const url = `${ESPN_SCOREBOARD}?${new URLSearchParams({
    seasontype: '2',
    week: String(weekNumber),
    season: String(year)
  })}`;

  let raw: unknown;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    raw = await res.json();
  } catch (err) {
    throw new EspnFetchError(
      `ESPN fetch failed week ${weekNumber}/${year}: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const parsed = EspnScoreboardSchema.safeParse(raw);
  if (!parsed.success) {
    throw new EspnParseError(
      `ESPN schema mismatch week ${weekNumber}/${year}: ${parsed.error.message}`
    );
  }

  const { week, events } = parsed.data;
  const games: EspnGame[] = [];

  for (const event of events) {
    const competition = event.competitions[0];
    if (!competition) continue;

    const home = competition.competitors.find((c) => c.homeAway === 'home');
    const away = competition.competitors.find((c) => c.homeAway === 'away');
    if (!home || !away) continue;

    const statusType = competition.status?.type;
    const status = statusType ? mapStatus(statusType.state, statusType.completed) : 'scheduled';

    games.push({
      scheduleGameId: event.id,
      date: event.date,
      homeTeamAbbr: normalizeAbbr(home.team.abbreviation),
      awayTeamAbbr: normalizeAbbr(away.team.abbreviation),
      status
    });
  }

  return { weekNumber: week.number, games };
}

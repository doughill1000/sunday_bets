import { z } from 'zod';

const ESPN_SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

export const NFL_REGULAR_SEASON_WEEKS = 18;

// ESPN preseason (seasontype=1) is the Hall of Fame weekend plus three preseason weekends.
// We over-iterate slightly and rely on empty-week skipping, so the exact count is not critical.
export const NFL_PRESEASON_WEEKS = 4;

// ---------------------------------------------------------------------------
// Zod schemas — catch ESPN schema drift before any DB write
// ---------------------------------------------------------------------------
const EspnTeamSchema = z.object({
  abbreviation: z.string(),
  displayName: z.string()
});

const EspnCompetitorSchema = z.object({
  homeAway: z.enum(['home', 'away']),
  // ESPN sends the score as a string ("24") on the scoreboard payload, absent on
  // far-future games. Accept string|number and tolerate missing (nullish); a drift
  // to any other shape fails the parse and is handled as a non-fatal miss (ADR-0025).
  score: z.union([z.number(), z.string()]).nullish(),
  team: EspnTeamSchema
});

const EspnStatusTypeSchema = z.object({
  state: z.string(),
  completed: z.boolean()
});

const EspnCompetitionSchema = z.object({
  competitors: z.array(EspnCompetitorSchema).min(2),
  // `displayClock` ("12:47") and `period` (quarter) sit alongside `type` on the live
  // scoreboard and drive the sweat board's clock (#386). Both are nullish — absent on
  // scheduled/final games — and additive, so grading and schedule sync (which read only
  // `type`, scores, and matchup) are unaffected.
  status: z
    .object({
      type: EspnStatusTypeSchema,
      displayClock: z.string().nullish(),
      period: z.number().nullish()
    })
    .optional()
});

const EspnEventSchema = z.object({
  id: z.string(),
  date: z.string(),
  competitions: z.array(EspnCompetitionSchema).min(1)
});

const EspnScoreboardSchema = z.object({
  // ESPN echoes the season it actually served. We validate it against the
  // requested year so a fallback response is never written as another season.
  season: z.object({ year: z.number() }).optional(),
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
  // Final/live scores when ESPN carries them; null on scheduled games or a score
  // field that could not be coerced to a number. Grading trusts these only on a
  // status === 'final' game (ADR-0025).
  homeScore: number | null;
  awayScore: number | null;
  status: 'scheduled' | 'in_progress' | 'final' | 'postponed';
  // Live game clock, present only while a game is in progress (#386): the ESPN display
  // clock ("12:47") and quarter/period. Null on scheduled and final games.
  displayClock: string | null;
  period: number | null;
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

// Coerce ESPN's competitor score (a string like "24", a number, or absent) to a
// number, or null when it is missing or non-numeric.
function parseScore(raw: number | string | null | undefined): number | null {
  if (raw == null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
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

// Retain the raw ESPN scoreboard payload (issue #450, extends the #382 Odds-API
// capture). Best-effort: retention must never break a schedule sync or a grade,
// so all errors are swallowed — same posture as recordRawResponse in odds.ts.
async function recordRawEspn(
  requestParams: Record<string, string>,
  httpStatus: number,
  body: unknown
): Promise<void> {
  try {
    const { recordEspnApiResponse } = await import('./espnApiResponses');
    await recordEspnApiResponse({ endpoint: 'scoreboard', requestParams, httpStatus, body });
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Fetch one week's scoreboard from the ESPN public endpoint.
// Throws EspnFetchError on network failure, EspnParseError on schema mismatch.
// Both are non-fatal from the caller's perspective (logged to Sentry, no DB write).
// Pass { retainRaw: true } from a grading caller to persist the raw payload for
// score-dispute audit; schedule sync leaves it off so it stays out of retention.
// ---------------------------------------------------------------------------
export async function fetchEspnWeek(
  year: number,
  weekNumber: number,
  // ESPN seasontype: 2 = regular season (default), 1 = preseason (ADR-0016 non-scoring round).
  seasonType: 1 | 2 = 2,
  opts?: { retainRaw?: boolean }
): Promise<EspnWeekResult> {
  // The scoreboard endpoint keys the schedule off `dates` (the season year),
  // NOT `season` — it silently ignores `season` and returns the current season,
  // so asking for a non-current year would otherwise yield the wrong games.
  const requestParams = {
    seasontype: String(seasonType),
    week: String(weekNumber),
    dates: String(year)
  };
  const url = `${ESPN_SCOREBOARD}?${new URLSearchParams(requestParams)}`;

  let raw: unknown;
  let httpStatus = 0;
  try {
    const res = await fetch(url);
    httpStatus = res.status;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    raw = await res.json();
  } catch (err) {
    throw new EspnFetchError(
      `ESPN fetch failed week ${weekNumber}/${year}: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // Persist the raw bytes before Zod validation so even a schema drift stays
  // auditable to its source (ADR-0025 fail-closed retention).
  if (opts?.retainRaw) {
    await recordRawEspn(requestParams, httpStatus, raw);
  }

  const parsed = EspnScoreboardSchema.safeParse(raw);
  if (!parsed.success) {
    throw new EspnParseError(
      `ESPN schema mismatch week ${weekNumber}/${year}: ${parsed.error.message}`
    );
  }

  const { season, week, events } = parsed.data;

  // Defense in depth: if ESPN reports a different season than we asked for
  // (a fallback/unpublished response), treat the week as having no schedule
  // data yet rather than importing another season's games.
  if (season && season.year !== year) {
    return { weekNumber: week.number, games: [] };
  }

  const games: EspnGame[] = [];

  for (const event of events) {
    const competition = event.competitions[0];
    if (!competition) continue;

    const home = competition.competitors.find((c) => c.homeAway === 'home');
    const away = competition.competitors.find((c) => c.homeAway === 'away');
    if (!home || !away) continue;

    const statusType = competition.status?.type;
    const status = statusType ? mapStatus(statusType.state, statusType.completed) : 'scheduled';
    // Surface the clock only for a game actually in progress, so a stale display value on a
    // scheduled/final payload never reads as live.
    const isLive = status === 'in_progress';

    games.push({
      scheduleGameId: event.id,
      date: event.date,
      homeTeamAbbr: normalizeAbbr(home.team.abbreviation),
      awayTeamAbbr: normalizeAbbr(away.team.abbreviation),
      homeScore: parseScore(home.score),
      awayScore: parseScore(away.score),
      status,
      displayClock: isLive ? (competition.status?.displayClock ?? null) : null,
      period: isLive ? (competition.status?.period ?? null) : null
    });
  }

  return { weekNumber: week.number, games };
}

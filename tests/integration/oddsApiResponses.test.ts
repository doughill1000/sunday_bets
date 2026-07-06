import { describe, test, expect, vi, afterEach, beforeAll } from 'vitest';
import { createSupaClient } from './_helpers';
import { ensureSettings } from './fixtures/db';
import { fetchNFLSpreadsForWeek } from '$lib/server/odds';
import * as oddsApiResponses from '$lib/server/oddsApiResponses';
import type { WeekWindow } from '$lib/types/server';

const supabase = createSupaClient();

const WEEK: WeekWindow = {
  id: 999901,
  startTs: '2024-09-01T00:00:00.000Z',
  endTs: '2024-09-08T00:00:00.000Z',
  weekNumber: 1
};

// Intercepts only requests to the Odds API; everything else (the Supabase test
// client's own HTTP calls) passes through to the real fetch untouched.
function mockOddsApiFetch(body: unknown, status = 200) {
  const originalFetch = globalThis.fetch;
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes('api.the-odds-api.com')) {
      return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json', 'x-requests-last': '1' }
      });
    }
    return originalFetch(input, init);
  });
}

describe('Odds API raw-response retention (issue #382)', () => {
  beforeAll(async () => {
    await ensureSettings(supabase);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('a successful spreads fetch persists the raw response with the api key stripped', async () => {
    const games = [
      {
        id: 'raw-response-test-game-1',
        commence_time: '2024-09-05T18:00:00Z',
        home_team: 'Kansas City Chiefs',
        away_team: 'Buffalo Bills',
        bookmakers: []
      }
    ];
    mockOddsApiFetch(games);

    const before = new Date(Date.now() - 1000).toISOString();
    const result = await fetchNFLSpreadsForWeek(WEEK);
    expect(result).toEqual(games);

    const { data, error } = await supabase
      .from('odds_api_responses')
      .select('*')
      .eq('endpoint', 'spreads')
      .gte('fetched_at', before)
      .order('fetched_at', { ascending: false })
      .limit(1);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    const row = data![0];
    expect(row.http_status).toBe(200);
    expect(row.request_params).not.toHaveProperty('apiKey');
    expect((row.request_params as Record<string, string>).markets).toBe('spreads');
    expect(row.body).toEqual(games);
  });

  test('a raw-response write failure does not break the fetch', async () => {
    mockOddsApiFetch([]);
    vi.spyOn(oddsApiResponses, 'recordOddsApiResponse').mockRejectedValueOnce(
      new Error('simulated write failure')
    );

    await expect(fetchNFLSpreadsForWeek(WEEK)).resolves.toEqual([]);
  });
});

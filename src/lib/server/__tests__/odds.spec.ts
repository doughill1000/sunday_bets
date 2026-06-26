import type { WeekWindow } from '$lib/types/server';
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

// Helper: set up env + (re)import the SUT with a fresh module state each test
async function loadSut() {
  vi.resetModules();

  // Mock SvelteKit env modules BEFORE importing SUT
  vi.mock('$env/dynamic/private', () => ({
    env: {
      ODDS_API_KEY1: 'k1',
      ODDS_API_KEY2: 'k2'
    }
  }));
  vi.mock('$env/static/public', () => ({
    PUBLIC_ODDS_API_BASE: 'https://api.example.com'
  }));

  // Now import the SUT (keys captured at module init)
  const sut = await import('../odds'); // path relative to this spec file
  return sut;
}

function urlParams(u: string) {
  const url = new URL(u);
  return { url, params: Object.fromEntries(url.searchParams.entries()) };
}

describe('lib/server/odds.ts', () => {
  beforeEach(() => {
    // Fresh fetch stub each test
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('fetchNFLSpreadsForWeek', () => {
    it('builds the correct URL with date window (+1 day) and rotates API keys', async () => {
      const { fetchNFLSpreadsForWeek } = await loadSut();

      // Arrange deterministic timestamps (UTC)
      const startIso = new Date(Date.UTC(2025, 8, 1, 12, 34, 56, 789)).toISOString();
      const endIso = new Date(Date.UTC(2025, 8, 7, 10, 0, 0, 250)).toISOString();

      // Mock fetch OK
      (fetch as unknown as Mock).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue([{ id: 'g1' }])
      });

      // Act (1) – first call (uses k1)
      const res1 = await fetchNFLSpreadsForWeek({
        startTs: startIso,
        endTs: endIso,
        weekNumber: 1
      } as WeekWindow);
      expect(res1).toEqual([{ id: 'g1' }]);

      // Assert URL/params
      const firstUrl = (fetch as any).mock.calls[0][0] as string;
      const { url: u1, params: p1 } = urlParams(firstUrl);
      expect(u1.pathname).toBe('/sports/americanfootball_nfl/odds');
      expect(p1.apiKey).toBe('k1');
      expect(p1.regions).toBe('us');
      expect(p1.markets).toBe('spreads');
      expect(p1.oddsFormat).toBe('american');
      expect(p1.dateFormat).toBe('iso');
      // commenceTimeFrom is startTs with ms removed
      expect(p1.commenceTimeFrom).toBe(new Date(startIso).toISOString().replace(/\.\d{3}Z$/, 'Z'));
      // commenceTimeTo is (endTs + 1 day) with ms removed
      const endPlus1 = new Date(endIso);
      endPlus1.setDate(endPlus1.getDate() + 1);
      expect(p1.commenceTimeTo).toBe(endPlus1.toISOString().replace(/\.\d{3}Z$/, 'Z'));

      // Act (2) – second call rotates to k2
      await fetchNFLSpreadsForWeek({
        startTs: startIso,
        endTs: endIso,
        weekNumber: 1
      } as WeekWindow);
      const secondUrl = (fetch as any).mock.calls[1][0] as string;
      const { params: p2 } = urlParams(secondUrl);
      expect(p2.apiKey).toBe('k2');

      // Act (3) – third call wraps back to k1
      await fetchNFLSpreadsForWeek({
        startTs: startIso,
        endTs: endIso,
        weekNumber: 1
      } as WeekWindow);
      const thirdUrl = (fetch as any).mock.calls[2][0] as string;
      const { params: p3 } = urlParams(thirdUrl);
      expect(p3.apiKey).toBe('k1');
    });

    it('uses preseason sport key when weekNumber < 0', async () => {
      const { fetchNFLSpreadsForWeek } = await loadSut();
      (fetch as any).mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue([]) });

      await fetchNFLSpreadsForWeek({
        startTs: new Date(Date.UTC(2025, 7, 10)).toISOString(),
        endTs: new Date(Date.UTC(2025, 7, 17)).toISOString(),
        weekNumber: -1 // preseason
      } as WeekWindow);

      const calledUrl = (fetch as any).mock.calls[0][0] as string;
      const { url } = urlParams(calledUrl);
      expect(url.pathname).toBe('/sports/americanfootball_nfl_preseason/odds');
    });

    it('throws a helpful error on non-OK response', async () => {
      const { fetchNFLSpreadsForWeek } = await loadSut();
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 429,
        text: vi.fn().mockResolvedValue('rate limited')
      });

      await expect(
        fetchNFLSpreadsForWeek({
          startTs: new Date().toISOString(),
          endTs: new Date().toISOString(),
          weekNumber: 1
        } as WeekWindow)
      ).rejects.toThrow('Odds API 429: rate limited');
    });
  });

  describe('fetchNFLScores', () => {
    it('requests scores with default daysFrom=1 and rotates API keys', async () => {
      const { fetchNFLScores } = await loadSut();
      (fetch as any).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue([{ id: 's1' }])
      });

      // First call – k1
      const s1 = await fetchNFLScores(); // default daysFrom=1
      expect(s1).toEqual([{ id: 's1' }]);
      const u1 = (fetch as any).mock.calls[0][0] as string;
      const { url: url1, params: p1 } = urlParams(u1);
      expect(url1.pathname).toBe('/sports/americanfootball_nfl/scores');
      expect(p1.daysFrom).toBe('1');
      expect(p1.apiKey).toBe('k1');

      // Second call – k2
      await fetchNFLScores(3);
      const u2 = (fetch as any).mock.calls[1][0] as string;
      const { params: p2 } = urlParams(u2);
      expect(p2.daysFrom).toBe('3');
      expect(p2.apiKey).toBe('k2');
    });

    it('throws a helpful error on non-OK response', async () => {
      const { fetchNFLScores } = await loadSut();
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue('boom')
      });

      await expect(fetchNFLScores()).rejects.toThrow('Odds API scores 500: boom');
    });
  });

  describe('extractFanduelSpread', () => {
    it('returns team name and absolute spread for favored (negative) outcome', async () => {
      const { extractFanduelSpread } = await loadSut();

      const game = {
        bookmakers: [
          {
            key: 'fanduel',
            markets: [
              {
                key: 'spreads',
                outcomes: [
                  { name: 'Team A', point: -3.5 },
                  { name: 'Team B', point: 3.5 }
                ]
              }
            ]
          }
        ]
      } as any;

      const res = extractFanduelSpread(game);
      expect(res).toEqual({ spreadTeamName: 'Team A', spreadValue: 3.5 });
    });

    it('falls back to the first outcome if no negative point exists', async () => {
      const { extractFanduelSpread } = await loadSut();

      const game = {
        bookmakers: [
          {
            key: 'fanduel',
            markets: [
              {
                key: 'spreads',
                outcomes: [
                  { name: 'Team A', point: 0 }, // no negative
                  { name: 'Team B', point: 0 } // no negative
                ]
              }
            ]
          }
        ]
      } as any;

      const res = extractFanduelSpread(game);
      expect(res).toEqual({ spreadTeamName: 'Team A', spreadValue: 0 });
    });

    it('returns null if Fanduel bookmaker or spreads market or outcomes are missing', async () => {
      const { extractFanduelSpread } = await loadSut();

      // No fanduel
      expect(
        extractFanduelSpread({ bookmakers: [{ key: 'draftkings', markets: [] }] } as any)
      ).toBeNull();

      // No spreads market
      expect(
        extractFanduelSpread({ bookmakers: [{ key: 'fanduel', markets: [] }] } as any)
      ).toBeNull();

      // Outcomes missing/insufficient
      expect(
        extractFanduelSpread({
          bookmakers: [{ key: 'fanduel', markets: [{ key: 'spreads', outcomes: [] }] }]
        } as any)
      ).toBeNull();

      expect(
        extractFanduelSpread({
          bookmakers: [
            { key: 'fanduel', markets: [{ key: 'spreads', outcomes: [{ name: 'Only One' }] }] }
          ]
        } as any)
      ).toBeNull();
    });
  });
});

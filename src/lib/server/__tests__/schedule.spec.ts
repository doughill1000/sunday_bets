import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { fetchEspnWeek, EspnFetchError, EspnParseError } from '../schedule';

const WEEK_1_RESPONSE = {
  week: { number: 1 },
  events: [
    {
      id: '401671850',
      date: '2026-09-10T00:15Z',
      competitions: [
        {
          competitors: [
            { homeAway: 'home', team: { abbreviation: 'PHI', displayName: 'Philadelphia Eagles' } },
            { homeAway: 'away', team: { abbreviation: 'KC', displayName: 'Kansas City Chiefs' } }
          ],
          status: { type: { state: 'pre', completed: false } }
        }
      ]
    },
    {
      id: '401671851',
      date: '2026-09-14T17:00Z',
      competitions: [
        {
          competitors: [
            { homeAway: 'home', team: { abbreviation: 'DAL', displayName: 'Dallas Cowboys' } },
            { homeAway: 'away', team: { abbreviation: 'NYG', displayName: 'New York Giants' } }
          ],
          status: { type: { state: 'post', completed: true } }
        }
      ]
    }
  ]
};

function mockFetch(body: unknown, ok = true) {
  (fetch as unknown as Mock).mockResolvedValueOnce({
    ok,
    status: ok ? 200 : 500,
    json: vi.fn().mockResolvedValue(body)
  });
}

describe('lib/server/schedule.ts', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('fetchEspnWeek', () => {
    it('parses a valid response and returns normalized games', async () => {
      mockFetch(WEEK_1_RESPONSE);

      const result = await fetchEspnWeek(2026, 1);

      expect(result.weekNumber).toBe(1);
      expect(result.games).toHaveLength(2);

      const [game1, game2] = result.games;
      expect(game1.scheduleGameId).toBe('401671850');
      expect(game1.homeTeamAbbr).toBe('PHI');
      expect(game1.awayTeamAbbr).toBe('KC');
      expect(game1.status).toBe('scheduled');

      expect(game2.scheduleGameId).toBe('401671851');
      expect(game2.status).toBe('final');
    });

    it('builds the correct ESPN URL', async () => {
      mockFetch(WEEK_1_RESPONSE);

      await fetchEspnWeek(2026, 3);

      const calledUrl = (fetch as unknown as Mock).mock.calls[0][0] as string;
      expect(calledUrl).toContain('seasontype=2');
      expect(calledUrl).toContain('week=3');
      // The scoreboard endpoint keys on `dates`, not `season` (issue #272): it
      // ignores `season` and returns the current season's games.
      expect(calledUrl).toContain('dates=2026');
      expect(calledUrl).not.toContain('season=2026');
    });

    it('returns no games when ESPN serves a different season than requested (issue #272)', async () => {
      // Reproduces the fallback that polluted prod: asking for 2026 but ESPN
      // echoing last season's completed games.
      mockFetch({
        season: { year: 2025 },
        week: { number: 1 },
        events: [
          {
            id: '401547001',
            date: '2025-09-05T00:20Z',
            competitions: [
              {
                competitors: [
                  {
                    homeAway: 'home',
                    team: { abbreviation: 'PHI', displayName: 'Philadelphia Eagles' }
                  },
                  { homeAway: 'away', team: { abbreviation: 'DAL', displayName: 'Dallas Cowboys' } }
                ],
                status: { type: { state: 'post', completed: true } }
              }
            ]
          }
        ]
      });

      const result = await fetchEspnWeek(2026, 1);
      expect(result.games).toHaveLength(0);
    });

    it('returns games when the payload season matches the requested year', async () => {
      mockFetch({ season: { year: 2026 }, ...WEEK_1_RESPONSE });

      const result = await fetchEspnWeek(2026, 1);
      expect(result.games).toHaveLength(2);
    });

    it('maps ESPN-specific abbreviations to internal keys', async () => {
      mockFetch({
        week: { number: 5 },
        events: [
          {
            id: '401671999',
            date: '2026-10-08T20:20Z',
            competitions: [
              {
                competitors: [
                  {
                    homeAway: 'home',
                    team: { abbreviation: 'WSH', displayName: 'Washington Commanders' }
                  },
                  {
                    homeAway: 'away',
                    team: { abbreviation: 'JAC', displayName: 'Jacksonville Jaguars' }
                  }
                ]
              }
            ]
          }
        ]
      });

      const result = await fetchEspnWeek(2026, 5);

      expect(result.games[0].homeTeamAbbr).toBe('WAS');
      expect(result.games[0].awayTeamAbbr).toBe('JAX');
    });

    it('defaults status to scheduled when competition status is absent', async () => {
      mockFetch({
        week: { number: 1 },
        events: [
          {
            id: '401000000',
            date: '2026-09-10T00:15Z',
            competitions: [
              {
                competitors: [
                  { homeAway: 'home', team: { abbreviation: 'BUF', displayName: 'Buffalo Bills' } },
                  { homeAway: 'away', team: { abbreviation: 'MIA', displayName: 'Miami Dolphins' } }
                ]
                // no status field
              }
            ]
          }
        ]
      });

      const result = await fetchEspnWeek(2026, 1);
      expect(result.games[0].status).toBe('scheduled');
    });

    it('returns empty games array when events list is empty', async () => {
      mockFetch({ week: { number: 2 }, events: [] });

      const result = await fetchEspnWeek(2026, 2);
      expect(result.games).toHaveLength(0);
    });

    it('throws EspnFetchError on non-OK HTTP response', async () => {
      mockFetch({}, false);

      await expect(fetchEspnWeek(2026, 1)).rejects.toThrow(EspnFetchError);
    });

    it('throws EspnFetchError on network failure', async () => {
      (fetch as unknown as Mock).mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(fetchEspnWeek(2026, 1)).rejects.toThrow(EspnFetchError);
    });

    it('throws EspnParseError when response does not match schema', async () => {
      mockFetch({ unexpected: 'shape' });

      await expect(fetchEspnWeek(2026, 1)).rejects.toThrow(EspnParseError);
    });

    it('skips events with no valid competitor pair', async () => {
      mockFetch({
        week: { number: 1 },
        events: [
          {
            id: '401000001',
            date: '2026-09-10T00:15Z',
            competitions: [
              {
                // both competitors are 'away' — no home found
                competitors: [
                  {
                    homeAway: 'away',
                    team: { abbreviation: 'NE', displayName: 'New England Patriots' }
                  },
                  { homeAway: 'away', team: { abbreviation: 'NYJ', displayName: 'New York Jets' } }
                ]
              }
            ]
          }
        ]
      });

      const result = await fetchEspnWeek(2026, 1);
      expect(result.games).toHaveLength(0);
    });
  });
});

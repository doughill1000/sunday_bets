import { describe, it, expect } from 'vitest';
import { staleReadModels } from '$lib/server/cronSummary';
import type { Json } from '$lib/types/supabase';

// The point of #623: a grade run whose best-effort refreshes failed still logs ok=true, so the
// only evidence is inside its own summary JSON. These cover reading that back — including the
// shapes the admin page will actually meet in cron_run_log, which is untyped jsonb written by
// seven different jobs.
describe('staleReadModels', () => {
  it('names both read models when both refreshes failed', () => {
    const summary = {
      weekIds: [301],
      readModels: {
        leaderboardStats: { ok: false, error: 'deadlock detected' },
        playerRatings: { ok: false, error: 'rating inputs unavailable' }
      }
    } as unknown as Json;

    expect(staleReadModels(summary)).toEqual(['leaderboard/stats matviews', 'credibility ratings']);
  });

  it('names only the step that failed', () => {
    const summary = {
      readModels: {
        leaderboardStats: { ok: true },
        playerRatings: { ok: false, error: 'boom' }
      }
    } as unknown as Json;

    expect(staleReadModels(summary)).toEqual(['credibility ratings']);
  });

  it('reports nothing when both refreshes succeeded', () => {
    const summary = {
      readModels: { leaderboardStats: { ok: true }, playerRatings: { ok: true } }
    } as unknown as Json;

    expect(staleReadModels(summary)).toEqual([]);
  });

  // Every cron_run_log row written before #623 — and every row from the six jobs that don't
  // refresh read models at all — lands here. None of them may render as degraded, and none may
  // throw on the admin page.
  it('reads non-reporting and malformed summaries as non-degraded', () => {
    expect(staleReadModels(null)).toEqual([]);
    expect(staleReadModels({ weekIds: [301], results: [] } as unknown as Json)).toEqual([]);
    expect(staleReadModels({ readModels: null } as unknown as Json)).toEqual([]);
    expect(staleReadModels({ readModels: 'refreshed' } as unknown as Json)).toEqual([]);
    expect(staleReadModels({ readModels: [] } as unknown as Json)).toEqual([]);
    expect(staleReadModels({ readModels: { playerRatings: 'ok' } } as unknown as Json)).toEqual([]);
    expect(staleReadModels([] as unknown as Json)).toEqual([]);
    expect(staleReadModels('done' as unknown as Json)).toEqual([]);
  });
});

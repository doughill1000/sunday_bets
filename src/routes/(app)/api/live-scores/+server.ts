// GET /api/live-scores — the live Sunday sweat board's data source (issue #386).
//
// Display-only pass-through: returns the active week's in-progress/final scores keyed to our
// game ids, plus the honest `fetchedAt`. Self-gated (no game live → no ESPN hit) and
// user-INDEPENDENT — the payload is identical for everyone, so a short shared CDN cache
// (`s-maxage`) collapses all concurrent viewers to ≤1 ESPN fetch per ~20s. Authentication
// gates access, not content. Grading/settlement are untouched (see `liveScores.ts`).
import { json, type RequestHandler } from '@sveltejs/kit';
import { getLiveScoresForActiveWeek } from '$lib/server/liveScores';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) return json({ error: 'unauthenticated' }, { status: 401 });

  const payload = await getLiveScoresForActiveWeek();

  return json(payload, {
    headers: {
      // Shared cache: ~20s at the edge with a brief stale-while-revalidate tail. Decouples
      // ESPN hit-rate from user count; the module memo in liveScores.ts backs it up when the
      // CDN cache is bypassed.
      'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=10'
    }
  });
};

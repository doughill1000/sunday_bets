// GET /api/week-live — is a game in the active week being played right now? (#776, #843)
//
// The Week nav tab's live-pulse dot is streamed with every layout load, so a normal navigation
// always carries a fresh value. What that cannot do is correct an app that is *resumed* rather
// than re-navigated: `weekLive` resolves once per navigation, so a long-open PWA keeps whatever
// value it last received — a dot lit at kickoff would still be lit after the final whistle. This
// endpoint is the cheap re-check for that case: the same server answer the layout streams,
// addressable on its own.
//
// User-INDEPENDENT (the answer is identical for everyone), so a short shared CDN cache collapses
// concurrent viewers, and the module memo behind `isActiveWeekLiveCached` backs it up when that
// cache is bypassed. Authentication gates access, not content — mirroring /api/live-scores.
// Display-only: nothing here writes, and grading stays the sole settlement authority.
import { json, type RequestHandler } from '@sveltejs/kit';
import { isActiveWeekLiveCached } from '$lib/server/liveScores';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) return json({ error: 'unauthenticated' }, { status: 401 });

  const live = await isActiveWeekLiveCached().catch(() => false);

  return json(
    { live },
    {
      headers: {
        // Shared cache, sized like /api/live-scores: the dot is a cue, not a scoreboard, so a
        // ~20s edge answer is plenty and keeps a resumed-PWA re-check off the origin.
        'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=10'
      }
    }
  );
};

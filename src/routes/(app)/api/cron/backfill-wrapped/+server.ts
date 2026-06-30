// Idempotent Season Wrapped backfill (#347). Generates a Wrapped for every group's already
// completed season (e.g. the imported 2022–2024 NFL seasons) that does not yet have one.
// Manual cron entry — guarded by the cron secret, safe to re-run: generateSeasonWrapped skips
// any subject that already has a row.
//
// Pass `?force=true` to REGENERATE: each existing row is re-voiced and replaced (fresh AI
// prose) instead of skipped. Use this to refresh blurbs after a prompt/facts change.
import type { RequestHandler } from './$types';
import { requireCronSecret, withCronLog } from '$lib/server/cron';
import { generateSeasonWrapped } from '$lib/server/seasonWrapped';
import { listCompletedGroupSeasons } from '$lib/server/db/queries/seasonWrapped';

export const POST: RequestHandler = async (event) => {
  const guard = requireCronSecret(event);
  if (guard) return guard;

  const force = event.url.searchParams.get('force') === 'true';

  const jobResult = await withCronLog('backfill-wrapped', async () => {
    const pairs = await listCompletedGroupSeasons();
    const totals = {
      groupSeasons: pairs.length,
      force,
      evaluated: 0,
      generated: 0,
      fallback: 0,
      skipped: 0,
      replaced: 0
    };
    for (const { groupId, seasonYear } of pairs) {
      const s = await generateSeasonWrapped(groupId, seasonYear, { force });
      totals.evaluated += s.evaluated;
      totals.generated += s.generated;
      totals.fallback += s.fallback;
      totals.skipped += s.skipped;
      totals.replaced += s.replaced;
    }
    return totals;
  });

  return new Response(JSON.stringify(jobResult), {
    status: jobResult.ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' }
  });
};

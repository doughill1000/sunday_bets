// Idempotent badge-flavor backfill (#416). Generates AI flavors for every group's already
// completed season (e.g. the imported 2022-2024 NFL seasons) that does not yet have them.
// Manual cron entry — guarded by the cron secret, safe to re-run: generateBadgeFlavors skips
// any badge that already has a row.
//
// Pass `?force=true` to REGENERATE: each existing row is re-voiced and replaced (fresh AI
// tagline) instead of skipped. Use this to refresh flavors after a prompt/facts change.
import type { RequestHandler } from './$types';
import { requireCronSecret, withCronLog } from '$lib/server/cron';
import { generateBadgeFlavors } from '$lib/server/badgeFlavor';
import { listCompletedGroupSeasons } from '$lib/server/db/queries/seasonWrapped';

export const POST: RequestHandler = async (event) => {
  const guard = requireCronSecret(event);
  if (guard) return guard;

  const force = event.url.searchParams.get('force') === 'true';

  const jobResult = await withCronLog('backfill-badge-flavors', async () => {
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
      const s = await generateBadgeFlavors(groupId, seasonYear, { force });
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

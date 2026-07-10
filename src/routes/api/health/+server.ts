// src/routes/api/health/+server.ts
//
// Free cron missed-run watchdog (issue #206). An external uptime monitor
// (UptimeRobot / Better Stack, free tier) polls this every few minutes:
//   200 {status:'ok'}       — every scheduled cron ran on time, sync under cap
//   503 {status:'degraded'} — a run is overdue, or odds sync is halted at the cap
// so a plain HTTP-status monitor alerts on a missed run or stale data without any
// paid Sentry Cron Monitor. A connection error / 5xx from the platform itself
// covers the whole-site-down case the same monitor can't get from Sentry.
//
// Lives under /api (not the auth-guarded (app) group) so it is reachable without
// a session, and is token-guarded (HEALTH_CHECK_TOKEN) so the operational surface
// is not openly enumerable. See docs/observability/health-watchdog.md.
import { json, type RequestHandler } from '@sveltejs/kit';
import { timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { CRON_SCHEDULES, buildHealthReport } from '$lib/server/cronHealth';
import { getLatestCronSuccesses } from '$lib/server/db/queries/getLatestCronSuccesses';
import { getSettings } from '$lib/server/settings';

// Constant-time compare of the `?token=` query param against HEALTH_CHECK_TOKEN.
// Fails closed when the env is unset/blank (mirrors requireCronSecret): an
// unconfigured token means nobody is authorized, so a forgotten env surfaces as a
// 401 the monitor flags — never as an accidentally-open endpoint.
function tokenOk(url: URL): boolean {
  const configured = env.HEALTH_CHECK_TOKEN;
  if (!configured || configured.trim().length === 0) return false;

  const provided = url.searchParams.get('token') ?? '';
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(configured, 'utf8');
  const max = Math.max(a.length, b.length);
  const pa = Buffer.concat([a, Buffer.alloc(max - a.length)]);
  const pb = Buffer.concat([b, Buffer.alloc(max - b.length)]);
  return a.length === b.length && timingSafeEqual(pa, pb);
}

export const GET: RequestHandler = async ({ url }) => {
  if (!tokenOk(url)) {
    return json({ status: 'unauthorized' }, { status: 401 });
  }

  try {
    const jobs = CRON_SCHEDULES.map((s) => s.job);
    const [lastSuccessByJob, settings] = await Promise.all([
      getLatestCronSuccesses(jobs),
      getSettings()
    ]);

    const report = buildHealthReport({
      now: new Date(),
      lastSuccessByJob,
      oddsUsed: settings?.odds_api_calls_used_current_month ?? null,
      oddsCap: settings?.odds_api_monthly_cap ?? null
    });

    return json(report, { status: report.status === 'ok' ? 200 : 503 });
  } catch (e) {
    // A read failure is itself an actionable "app or DB unhealthy" signal — return
    // 503 so the monitor treats it as down rather than swallowing it.
    return json(
      { status: 'degraded', error: e instanceof Error ? e.message : 'health check failed' },
      { status: 503 }
    );
  }
};

// Regenerate the public demo-season snapshot fixture (#460, ADR-0026).
//
// Like `refresh-wrapped`, this drives the running app rather than touching the DB directly: the
// snapshot must be assembled by the real read-model / Wrapped-generation layer (which imports
// `$env` and so can't be imported here), and the real AI prose only exists inside a runtime
// with the Vercel AI Gateway creds. So this script just calls the cron-secret-guarded
// `/api/cron/demo-snapshot` export endpoint and writes its JSON to the committed fixture.
//
// Usage:
//   1. Seed the demo league:            pnpm db:reset:demo   (or pnpm db:seed:demo)
//   2. Start the app:                   pnpm dev  (or point DEMO_SNAPSHOT_BASE_URL at a deploy)
//   3. Regenerate the fixture:          pnpm demo:snapshot
//
// Env (.env.local): CRON_SECRET (guards the endpoint), PUBLIC_SUPABASE_URL (unused here).
// Optional: DEMO_SNAPSHOT_BASE_URL (default http://localhost:5173), DEMO_SNAPSHOT_GROUP,
// DEMO_SNAPSHOT_PERSONA, DEMO_SNAPSHOT_SEASON to override the featured identity.
import 'dotenv/config';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const FIXTURE_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../src/lib/server/demo/demo-snapshot.json'
);

async function main(): Promise<void> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('Missing CRON_SECRET (expected in .env.local).');

  const baseUrl = (process.env.DEMO_SNAPSHOT_BASE_URL ?? 'http://localhost:5173').replace(
    /\/$/,
    ''
  );
  const qs = new URLSearchParams();
  if (process.env.DEMO_SNAPSHOT_GROUP) qs.set('group', process.env.DEMO_SNAPSHOT_GROUP);
  if (process.env.DEMO_SNAPSHOT_PERSONA) qs.set('persona', process.env.DEMO_SNAPSHOT_PERSONA);
  if (process.env.DEMO_SNAPSHOT_SEASON) qs.set('season', process.env.DEMO_SNAPSHOT_SEASON);
  const endpoint = `${baseUrl}/api/cron/demo-snapshot${qs.toString() ? `?${qs}` : ''}`;

  console.log(`GET ${endpoint}`);
  const res = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${cronSecret}` }
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`demo-snapshot export returned ${res.status}: ${body}`);

  // Pretty-print so the committed fixture diffs cleanly on regeneration.
  const snapshot = JSON.parse(body);
  await writeFile(FIXTURE_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

  console.log(`\n✅ Wrote demo snapshot → ${FIXTURE_PATH}`);
  console.log(`   group=${snapshot.meta?.groupName} season=${snapshot.meta?.completedSeasonYear}`);
  console.log(
    `   persona=${snapshot.persona?.displayName} liveWeek=${snapshot.meta?.liveWeekNumber}`
  );
  console.log(`   AI prose: ${snapshot.meta?.aiProse}`);
  if (snapshot.meta?.aiProse === 'fallback') {
    console.log(
      '   ⚠  Prose is the deterministic fallback (no AI Gateway creds in this runtime). Re-run\n' +
        '      against a deploy with gateway creds (DEMO_SNAPSHOT_BASE_URL) for real LLM prose.'
    );
  }
}

main().catch((err) => {
  console.error('\n❌ demo:snapshot failed:', err);
  process.exit(1);
});

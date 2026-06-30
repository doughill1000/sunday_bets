// Refresh Season Wrapped (#347): re-trigger the deployed backfill-wrapped cron so the app
// regenerates fresh AI prose for every subject.
//
// The regeneration MUST run in the deployed app: the AI Gateway call uses Vercel OIDC creds
// that only exist in the Vercel runtime (ADR-0008), so this script does not voice blurbs or
// touch the DB directly — it just POSTs the cron-secret-guarded endpoint. Pass --force to
// overwrite existing rows (regenerate-then-replace); without it, only missing Wrappeds are
// generated and existing rows are left as-is.
//
// Usage (prod):
//   pnpm refresh-wrapped:prod -- --force   # regenerate every subject (overwrite)
//   pnpm refresh-wrapped:prod              # fill in only missing Wrappeds
//
// Required env (.env.production): CRON_SECRET
// Optional env: WRAPPED_BASE_URL (defaults to https://sunday-bets.vercel.app)

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const baseUrl = process.env.WRAPPED_BASE_URL ?? 'https://sunday-bets.vercel.app';

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('Missing CRON_SECRET (put it in .env.production).');

  // Content-Type application/json dodges SvelteKit's cross-site form-POST CSRF guard.
  const endpoint = `${baseUrl.replace(/\/$/, '')}/api/cron/backfill-wrapped${force ? '?force=true' : ''}`;
  console.log(`POST ${endpoint}`);
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cronSecret}`, 'Content-Type': 'application/json' }
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`backfill-wrapped returned ${res.status}: ${body}`);
  console.log('backfill-wrapped response:');
  console.log(body);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

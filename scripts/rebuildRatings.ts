#!/usr/bin/env tsx
/**
 * One-shot rebuild of the persisted credibility rating read model (issue #361, ADR-0032).
 *
 * `public.player_ratings` is normally rebuilt automatically after every grade
 * (src/lib/server/grading.ts calls rebuildPlayerRatings() as a best-effort, post-commit step —
 * see src/lib/server/rating/rebuild.ts). This script exists for the cases that AREN'T "after a
 * grade" — most notably landing a fold-formula change (e.g. the v2 order-independent shrunk
 * cover-rate model) and needing every existing rating recomputed under the new formula without
 * waiting for the next graded game.
 *
 * Usage:
 *   pnpm ratings:rebuild                       # rebuilds against .env.local (default)
 *   pnpm ratings:rebuild -- --env=.env.staging
 *   pnpm ratings:rebuild -- --env=.env.production
 *
 * Required env (in the chosen --env file): PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE
 * (service-role key — this bypasses RLS, same as the grading path).
 *
 * A plain `import { rebuildPlayerRatings } from '../src/lib/server/rating/rebuild'` now works
 * directly (issue #619): rebuild.ts's client parameter is required, not a `= supabaseService`
 * default, so the module carries no static import of `$lib/supabase/service` — and therefore no
 * transitive `$env/*` SvelteKit-virtual-module dependency — at all. This used to fail with
 * `Error [ERR_MODULE_NOT_FOUND]: Cannot find package '$env'` under plain `tsx`, requiring a Vite
 * SSR module-loading workaround; that workaround is gone along with the cause. The rebuild always
 * runs against the client THIS script constructs and passes in explicitly (mirroring
 * supabase/scripts/cloneDb.ts and provision-users.ts's env-loading/client-construction
 * convention).
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/types/supabase';
import { rebuildPlayerRatings } from '../src/lib/server/rating/rebuild';

const arg = (prefix: string) =>
  process.argv.find((a) => a.startsWith(prefix))?.slice(prefix.length);

const envFile = arg('--env=') ?? '.env.local';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const must = (k: string) => {
  const v = process.env[k];
  if (!v) {
    console.error(`Missing ${k} in ${envFile}`);
    process.exit(1);
  }
  return v;
};

const url = must('PUBLIC_SUPABASE_URL');
const serviceKey = must('SUPABASE_SERVICE_ROLE');

async function main(): Promise<void> {
  console.log(`Target:   ${url}`);
  console.log(`Env file: ${envFile}`);
  console.log('');

  const client = createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  let failed = false;
  console.log('Rebuilding public.player_ratings…');
  await rebuildPlayerRatings(client, {
    onError: (err) => {
      failed = true;
      console.error('rebuildPlayerRatings reported an error:', err);
    }
  });

  const { count, error: countError } = await client
    .from('player_ratings')
    .select('*', { count: 'exact', head: true });
  if (countError) throw countError;

  console.log(`player_ratings now has ${count ?? 'unknown'} row(s).`);
  if (failed) {
    console.error('\n❌ Rebuild reported at least one error (see above); ratings may be stale.');
    process.exit(1);
  }
  console.log('\n✅ Rebuild complete.');
}

main().catch((err) => {
  console.error('\n❌ ratings:rebuild failed.');
  console.error(err instanceof Error ? (err.stack ?? `${err.name}: ${err.message}`) : err);
  process.exit(1);
});

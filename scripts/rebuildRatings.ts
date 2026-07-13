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
 * Why this doesn't just `import { rebuildPlayerRatings } from '../src/lib/server/rating/rebuild'`:
 * rebuild.ts's default client parameter (`= supabaseService`) statically imports
 * $lib/supabase/service, which statically imports $env/static/public and $env/dynamic/private —
 * SvelteKit virtual modules that only exist inside the Vite/SvelteKit plugin pipeline. Confirmed
 * empirically: a plain `tsx`/`node --import tsx` import of rebuild.ts fails immediately with
 * `Error [ERR_MODULE_NOT_FOUND]: Cannot find package '$env'` — the same failure
 * supabase/scripts/demo-snapshot/index.ts's header comment warns about for the same reason
 * ("the real read-model ... layer ... imports $env and so can't be imported here"). rebuild.ts
 * itself is otherwise environment-agnostic and out of scope for this change, so rather than
 * editing it, this script loads it through Vite's own programmatic SSR module runner
 * (`createServer` + `ssrLoadModule`, middleware-mode, no HTTP server actually bound) — the same
 * mechanism SvelteKit's dev server and vitest already use to resolve `$env/*`. The rebuild always
 * runs against the client THIS script constructs and passes in explicitly (mirroring
 * supabase/scripts/cloneDb.ts and provision-users.ts's env-loading/client-construction
 * convention), so rebuild.ts's own `supabaseService` default is never touched or required to work.
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { createServer } from 'vite';
import type { Database } from '../src/lib/types/supabase';
import type { rebuildPlayerRatings as RebuildPlayerRatingsFn } from '../src/lib/server/rating/rebuild';

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

  // Load rebuild.ts through Vite's SSR module graph (not a static import) — see the file header
  // for why. logLevel is turned down so this stays a quiet, focused CLI tool.
  const server = await createServer({
    configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)),
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'warn'
  });

  let failed = false;
  try {
    const mod = (await server.ssrLoadModule('/src/lib/server/rating/rebuild.ts')) as {
      rebuildPlayerRatings: typeof RebuildPlayerRatingsFn;
    };
    console.log('Rebuilding public.player_ratings…');
    await mod.rebuildPlayerRatings(client, {
      onError: (err) => {
        failed = true;
        console.error('rebuildPlayerRatings reported an error:', err);
      }
    });
  } finally {
    await server.close();
  }

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

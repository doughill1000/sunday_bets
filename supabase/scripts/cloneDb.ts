#!/usr/bin/env tsx
import dotenv from 'dotenv';
import path from 'path';
import { execa } from 'execa';
import fs from 'fs';
import os from 'os';
import postgres from 'postgres';
import {
  computePlayerRatings,
  type RatingDecision
} from '../../src/lib/server/rating/computeRatings.ts';

const envFileArg = process.argv.find((arg) => arg.startsWith('--env='));
const envFile = envFileArg ? envFileArg.replace('--env=', '') : process.env.ENV_FILE || '.env';

dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const must = (k: string, hint?: string) => {
  const v = process.env[k];
  if (!v) {
    console.error(`Missing ${k} in environment (.env)${hint ? `\n${hint}` : ''}`);
    process.exit(1);
  }
  return v;
};

const PROD = must(
  'SUPABASE_DB_URL_PROD',
  'Prod-clone (pnpm db:reset:local / db:clone:*) reads SUPABASE_DB_URL_PROD, which lives\n' +
    'in no committed .env* and is NOT copied into git worktrees — run it from the main\n' +
    'checkout (or a shell that exports it). To apply schema locally without prod data,\n' +
    'use `pnpm db:push:local` instead.'
);

function cliVal(prefix: string) {
  return process.argv.find((a) => a.startsWith(prefix))?.split('=')[1];
}

const explicitDest = cliVal('--dest=') || process.env.CLONE_DEST_URL;
const target = (cliVal('--target=') || process.env.CLONE_TARGET || 'dev').toLowerCase();

let DEST: string;
if (explicitDest) {
  DEST = explicitDest;
} else if (target === 'local') {
  DEST = must('SUPABASE_DB_URL_LOCAL');
} else {
  DEST = must('SUPABASE_DB_URL_DEV');
}

const DUMP_ROLES = (process.env.CLONE_DUMP_ROLES ?? 'false') === 'true';
const RESET =
  (process.env.DEV_RESET ?? (process.argv.includes('--reset') ? 'true' : 'false')) === 'true';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sb-clone-'));
const rolesSql = path.join(tmpDir, 'roles.sql');
const dataPublic = path.join(tmpDir, 'data_public.sql');

async function hasBin(cmd: string) {
  try {
    await execa(process.platform === 'win32' ? 'where' : 'which', [cmd]);
    return true;
  } catch {
    return false;
  }
}

const p = (s: string) => s.replace(/\\/g, '/');

async function main() {
  console.log(`Temp dir: ${tmpDir}`);
  console.log(`Source: PROD`);
  console.log(`Destination: (${DEST})`);
  if (RESET) console.log('Mode: RESET destination before load');

  if (!(await hasBin('supabase'))) {
    console.error('Supabase CLI not found. Install: https://supabase.com/docs/guides/cli');
    process.exit(1);
  }
  if (!(await hasBin('psql'))) {
    console.error('psql not found. Install PostgreSQL client or use WSL.');
    process.exit(1);
  }

  if (DUMP_ROLES) {
    console.log('Dumping roles…');
    await execa('supabase', ['db', 'dump', '--db-url', PROD, '-f', rolesSql, '--role-only'], {
      stdio: 'inherit'
    });
  }

  // Exclude public.users when cloning into dev (to keep existing dev users)
  const excludeUsers = target === 'dev';
  console.log(
    `Dumping public data…${excludeUsers ? ' (excluding public.users for target=dev)' : ''}`
  );
  const dumpArgs = [
    'db',
    'dump',
    '--db-url',
    PROD,
    '-f',
    dataPublic,
    '--data-only',
    '--schema',
    'public'
  ];
  if (excludeUsers) {
    // supabase CLI passes through to pg_dump; --exclude-table should work
    dumpArgs.push('--exclude', 'public.users');
  }
  await execa('supabase', dumpArgs, { stdio: 'inherit' });

  console.log(`Restoring into destination…`);
  const chunks: string[] = ['\\set ON_ERROR_STOP on', 'BEGIN;'];

  if (RESET) {
    chunks.push(`
      -- Truncate (ordered loosely by FK dependencies; CASCADE covers the rest)
      TRUNCATE
        public.audit_log,
        public.pick_settlement,
        public.picks,
        public.results,
        public.game_lines,
        public.totals,
        public.games,
        public.weeks,
        public.seasons,
        public.teams,
        public.settings
      RESTART IDENTITY CASCADE;
    `);
  }

  if (DUMP_ROLES) chunks.push(`\\i ${p(rolesSql)}`);
  chunks.push(
    'SET session_replication_role = replica;',
    `\\i ${p(dataPublic)}`,
    'SET session_replication_role = default;',
    'COMMIT;'
  );

  // The leaderboard/stats matviews (issue #191) were populated WITH DATA when migrations
  // ran against an empty DB, so they are stale after loading prod data. Refresh them once
  // the data is committed. Guarded so older destinations without the function still clone.
  chunks.push(
    `DO $$ BEGIN
       IF to_regprocedure('public.refresh_leaderboard_stats()') IS NOT NULL THEN
         PERFORM public.refresh_leaderboard_stats();
       END IF;
     END $$;`
  );

  const restoreSql = chunks.join('\n');
  await execa('psql', ['--dbname', DEST], {
    stdio: ['pipe', 'inherit', 'inherit'],
    input: restoreSql
  });

  await rebuildPlayerRatingsOverRawSql();

  console.log('Clone complete ✅');
  console.log(`Temp artifacts: ${tmpDir}`);
  console.log('Done.');
}

// Cloning prod data writes settlements without going through the app's grading.ts caller, so
// public.player_ratings is left empty/stale after a clone unless it's rebuilt here (issue #619,
// ADR-0032 §8 "the rebuild must run on every settlement-writing path" — this was the gap that
// forced a manual hand-populate of prod right after #618 merged). This script otherwise only
// speaks raw psql/pg_dump, never supabase-js, so rather than requiring a PostgREST URL + service
// key for the destination (which cloneDb.ts has never needed), the rebuild's two real pieces are
// invoked directly over the same `DEST` connection this script already has: the pure TS fold
// (computePlayerRatings, zero I/O, identical to what rebuild.ts calls) computes the ratings, and
// the atomic `_rebuild_player_ratings` RPC (the same one rebuild.ts calls) persists them in one
// transaction. Guarded so an older destination without the function/view still clones; best-effort
// like every other rebuildPlayerRatings caller — a failure here logs and leaves ratings to
// self-heal on the next grade, rather than failing the whole clone.
async function rebuildPlayerRatingsOverRawSql(): Promise<void> {
  const sql = postgres(DEST);
  try {
    const [{ has_view }] = await sql`
      select to_regclass('public.player_rating_inputs') is not null as has_view
    `;
    const [{ has_fn }] = await sql`
      select to_regprocedure('public._rebuild_player_ratings(jsonb, timestamptz)') is not null as has_fn
    `;
    if (!has_view || !has_fn) {
      console.log('Skipping player_ratings rebuild (destination predates issue #619).');
      return;
    }

    console.log('Rebuilding player_ratings…');
    const inputs = (await sql`
      select group_id, user_id, season_year, commence_time, game_id, weight, outcome
      from public.player_rating_inputs
    `) as unknown as RatingDecision[];
    const results = computePlayerRatings(inputs);
    const computedAt = new Date().toISOString();
    const rows = results.map((r) => ({
      group_id: r.group_id,
      user_id: r.user_id,
      rating: r.rating,
      decisions: r.decisions,
      decisions_to_qualify: r.decisionsToQualify,
      season_delta: r.seasonDelta
    }));
    await sql`select public._rebuild_player_ratings(${sql.json(rows)}::jsonb, ${computedAt}::timestamptz)`;
    console.log(`player_ratings rebuilt (${rows.length} row(s)).`);
  } catch (err) {
    console.error(
      'player_ratings rebuild failed (ratings may be stale until the next grade):',
      err instanceof Error ? err.message : String(err)
    );
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error('\n❌ Clone failed:', err?.stderr || err?.message || err);
  process.exit(1);
});

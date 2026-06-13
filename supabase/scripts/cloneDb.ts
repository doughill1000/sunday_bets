#!/usr/bin/env tsx
import dotenv from 'dotenv';
import path from 'path';
import { execa } from 'execa';
import fs from 'fs';
import os from 'os';

const envFileArg = process.argv.find((arg) => arg.startsWith('--env='));
const envFile = envFileArg ? envFileArg.replace('--env=', '') : process.env.ENV_FILE || '.env';

dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const must = (k: string) => {
  const v = process.env[k];
  if (!v) {
    console.error(`Missing ${k} in environment (.env)`);
    process.exit(1);
  }
  return v;
};

const PROD = must('SUPABASE_DB_URL_PROD');

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

const CLEAN_SESSIONS = (process.env.DEV_CLEAR_SESSIONS ?? 'true') === 'true';
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

  const restoreSql = chunks.join('\n');
  await execa('psql', ['--dbname', DEST], {
    stdio: ['pipe', 'inherit', 'inherit'],
    input: restoreSql
  });

  console.log('Clone complete ✅');
  console.log(`Temp artifacts: ${tmpDir}`);
  console.log('Done.');
}

main().catch((err) => {
  console.error('\n❌ Clone failed:', err?.stderr || err?.message || err);
  process.exit(1);
});

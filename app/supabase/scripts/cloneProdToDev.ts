#!/usr/bin/env ts-node

import 'dotenv/config';
import { execa } from 'execa';
import fs from 'fs';
import path from 'path';
import os from 'os';

const must = (k: string) => {
  const v = process.env[k];
  if (!v) {
    console.error(`Missing ${k} in environment (.env)`);
    process.exit(1);
  }
  return v;
};

const PROD = must('SUPABASE_DB_URL_PROD');      // full postgres URI incl ?sslmode=require
const DEV  = must('SUPABASE_DB_URL_DEV');       // full postgres URI incl ?sslmode=require

// Toggles (can come from .env or CLI flags)
const CLEAN_SESSIONS = (process.env.DEV_CLEAR_SESSIONS ?? 'true') === 'true';
const DUMP_ROLES     = (process.env.CLONE_DUMP_ROLES ?? 'false') === 'true'; // usually NOT needed
const RESET          = (process.env.DEV_RESET ?? process.argv.includes('--reset') ? 'true' : 'false') === 'true';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sb-clone-'));

// Output files
const rolesSql   = path.join(tmpDir, 'roles.sql');
const dataPublic = path.join(tmpDir, 'data_public.sql');

// Small helper: check binaries exist
async function hasBin(cmd: string) {
  try {
    await execa(process.platform === 'win32' ? 'where' : 'which', [cmd]);
    return true;
  } catch { return false; }
}

// Normalize paths for psql \i on Windows
const p = (s: string) => s.replace(/\\/g, '/');

async function main() {
  console.log(`Using temp dir: ${tmpDir}`);

  if (!(await hasBin('supabase'))) {
    console.error('Supabase CLI not found. Install: https://supabase.com/docs/guides/cli');
    process.exit(1);
  }
  if (!(await hasBin('psql'))) {
    console.error('psql not found (PostgreSQL client). Install Postgres client or use WSL.');
    process.exit(1);
  }

  // 1) Optional: dump roles
  if (DUMP_ROLES) {
    console.log('Dumping roles (optional)…');
    await execa('supabase', ['db','dump','--db-url', PROD, '-f', rolesSql, '--role-only'], { stdio: 'inherit' });
  }

  // 2) DATA for public
  console.log('Dumping data (public)…');
  await execa('supabase', [
    'db','dump','--db-url', PROD,
    '-f', dataPublic,
    '--data-only','--schema','public'
  ], { stdio: 'inherit' });

  // 4) Restore into DEV
  console.log(`Restoring into DEV${RESET ? ' (with reset)' : ''}…`);
  const chunks: string[] = ['\\set ON_ERROR_STOP on', 'BEGIN;'];

  if (RESET) {
    chunks.push(`
      -- Nuke public tables
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
        public.settings,
        public.users
      RESTART IDENTITY CASCADE;
    `);
  }

  if (DUMP_ROLES) chunks.push(`\\i ${p(rolesSql)}`);
  chunks.push(
    'SET session_replication_role = replica;',
    `\\i ${p(dataPublic)}`,
    'COMMIT;'
  );

  const restoreSql = chunks.join('\n');

  await execa('psql', ['--dbname', DEV], {
    stdio: ['pipe','inherit','inherit'],
    input: restoreSql
  });

  console.log('Clone complete ✅');
  if (RESET) console.log('DEV reset before import.');
  if (CLEAN_SESSIONS) console.log('DEV sessions cleared so everyone signs in fresh.');
  console.log(`Temp files in: ${tmpDir}`);
}

main().catch(err => {
  console.error('\n❌ Clone failed:', err?.stderr || err?.message || err);
  process.exit(1);
});

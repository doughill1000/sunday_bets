// scripts/backup-db.mjs
// Usage (package.json): "backup:prod": "node -r dotenv/config scripts/backup-db.mjs dotenv_config_path=.env.production"
// Required env: SUPABASE_DB_URL
// Optional env: RCLONE_REMOTE=onedrive, RCLONE_DIR=supabase-backups, BACKUP_PREFIX=supabase, BACKUP_OUT_DIR=backups, PG_DUMP_BIN=pg_dump

import { spawnSync, execSync } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error('❌ Missing DATABASE_URL (put it in .env.production).');
  process.exit(1);
}

const PG_DUMP_BIN = process.env.PG_DUMP_BIN || 'pg_dump';
const RCLONE_REMOTE = process.env.RCLONE_REMOTE || 'onedrive';
const RCLONE_DIR = process.env.RCLONE_DIR || 'supabase-backups';
const BACKUP_PREFIX = process.env.BACKUP_PREFIX || 'supabase';
const OUT_DIR = process.env.BACKUP_OUT_DIR || 'backups';

// filename: supabase_20250917T190356Z_ab12cd3.dump
const ts = new Date()
  .toISOString()
  .replace(/[-:]/g, '')
  .replace(/\.\d+Z$/, 'Z');
let sha = '';
try {
  sha = execSync('git rev-parse --short HEAD').toString().trim();
} catch {}
const short = sha ? `_${sha}` : '';
const fileName = `${BACKUP_PREFIX}_${ts}${short}.dump`;

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
const absOutDir = resolve(OUT_DIR);
const localPath = join(absOutDir, fileName);

// 1) Dump
console.log(`🗄️  Dumping DB → ${localPath}`);
{
  const args = [
    `--dbname=${DB_URL}`,
    '--format=custom',
    '--no-owner',
    '--no-privileges',
    '--compress=9',
    `--file=${localPath}`
  ];
  const r = spawnSync(PG_DUMP_BIN, args, { stdio: 'inherit', shell: false });
  if (r.status !== 0) {
    console.error('❌ pg_dump failed.');
    process.exit(r.status || 1);
  }
}

// 2) Upload
console.log(`☁️  Uploading → ${RCLONE_REMOTE}:${RCLONE_DIR}/`);
{
  const r = spawnSync('rclone', ['copy', localPath, `${RCLONE_REMOTE}:${RCLONE_DIR}/`], {
    stdio: 'inherit'
  });
  if (r.status !== 0) {
    console.error('❌ rclone copy failed (local file kept).');
    process.exit(r.status || 1);
  }
}

console.log(`✅ Backup complete: ${fileName}`);

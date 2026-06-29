// Usage: node -r dotenv/config supabase/scripts/refresh-matviews.mjs dotenv_config_path=.env.production
// Required env: DATABASE_URL

import { spawnSync } from 'node:child_process';

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error('Missing DATABASE_URL (put it in .env.production).');
  process.exit(1);
}

console.log('Refreshing all materialized views via refresh_leaderboard_stats()...');

const result = spawnSync('psql', [DB_URL, '-c', 'SELECT public.refresh_leaderboard_stats();'], {
  stdio: 'inherit',
  shell: false
});

if (result.status !== 0) {
  console.error('psql failed.');
  process.exit(result.status || 1);
}

console.log('Done.');

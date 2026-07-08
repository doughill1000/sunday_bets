// Apply the generated historical kickoff-time backfill against a target DB.
//
// Usage (staging first, then production):
//   node -r dotenv/config supabase/scripts/backfill-game-times/run.mjs dotenv_config_path=.env.staging
//   node -r dotenv/config supabase/scripts/backfill-game-times/run.mjs dotenv_config_path=.env.production
//
// Required env: DATABASE_URL (loaded from the chosen .env by dotenv). Mirrors
// supabase/scripts/refresh-matviews.mjs. The SQL is idempotent; re-running is safe.

import { spawnSync } from 'node:child_process';
import path from 'node:path';

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error('Missing DATABASE_URL (put it in the .env file you point dotenv_config_path at).');
  process.exit(1);
}

const file = path.join('supabase', 'scripts', 'backfill-game-times', 'backfill_game_times.sql');
console.log(`Applying ${file} ...`);

const result = spawnSync('psql', [DB_URL, '-v', 'ON_ERROR_STOP=1', '-f', file], {
  stdio: 'inherit',
  shell: false
});

if (result.status !== 0) {
  console.error('psql failed.');
  process.exit(result.status || 1);
}
console.log('Done.');

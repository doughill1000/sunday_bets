// Copies the repo's generated Supabase types into the mobile app.
// The source of truth is src/lib/types/supabase.ts at the repo root (regenerated
// with `pnpm db:types`); run `pnpm sync:types` here after any schema change.
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, '../../src/lib/types/supabase.ts');
const target = resolve(here, '../src/types/supabase.ts');

if (!existsSync(source)) {
  console.error(`Source types not found: ${source}`);
  console.error('Run this from a full repo checkout (mobile/ lives inside the web repo).');
  process.exit(1);
}

copyFileSync(source, target);
console.log(`Copied ${source} -> ${target}`);

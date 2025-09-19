// Usage:
// pnpm backfill -- "C:\\path\\NFL 2025.xlsx" --season 2025 --lock-at-kickoff --dry-run
import 'dotenv/config';
import { read as xlsxRead } from 'xlsx';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { makeClient, getSeasonWeekMap, getTeamsMap } from './db.ts';
import { importLongWeekSheet } from './long-format.ts';
import { USER_COLUMNS } from './users.ts';

const argv = process.argv.slice(2);
const INPUT_XLSX = argv.find((a) => a.endsWith('.xlsx')) ?? 'NFL 2025.xlsx';
const getFlag = (name: string) => {
  const i = argv.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (i === -1) return undefined;
  const a = argv[i];
  const eq = a.indexOf('=');
  if (eq !== -1) return a.slice(eq + 1);
  return argv[i + 1];
};

const DRY_RUN = argv.includes('--dry-run');
const LOCK_AT_KICKOFF = argv.includes('--lock-at-kickoff');
const SEASON_YEAR = Number(getFlag('season') ?? '0');
if (!SEASON_YEAR) {
  console.error('Pass --season <year>, e.g. --season 2025');
  process.exit(1);
}
const WEEKS_FILTER = (getFlag('weeks') ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map((s) => Number(s));
const FALLBACK_KICKOFF = getFlag('fallback-kickoff');

async function run() {
  const supabase = makeClient();

  const xlsxPath = path.resolve(INPUT_XLSX);
  console.log(`Reading ${xlsxPath} ...`);
  const buf = readFileSync(xlsxPath);
  const wb = xlsxRead(buf, { type: 'buffer' });

  const sheetNames = wb.SheetNames.filter((n) => /^Week\s+\d+$/i.test(n));
  const { weekByNumber } = await getSeasonWeekMap(supabase, SEASON_YEAR);
  const teamMap = await getTeamsMap(supabase);

  const selectedSheets = sheetNames.filter((name) => {
    if (!WEEKS_FILTER.length) return true;
    const wk = Number(name.replace(/[^0-9]/g, ''));
    return WEEKS_FILTER.includes(wk);
  });

  for (const sheetName of selectedSheets) {
    const wkNum = Number(sheetName.replace(/[^0-9]/g, ''));
    const weekInfo = weekByNumber.get(wkNum);
    if (!weekInfo) {
      console.warn(`Week ${wkNum} not found for season ${SEASON_YEAR} — skipping ${sheetName}`);
      continue;
    }

    await importLongWeekSheet({
      supabase,
      wb,
      sheetName,
      weekId: weekInfo.id,
      teamMap,
      userColumns: USER_COLUMNS,
      options: {
        fallbackKickoff: FALLBACK_KICKOFF,
        lockAtKickoff: LOCK_AT_KICKOFF,
        dryRun: DRY_RUN
      }
    });
  }

  console.log('Backfill complete.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

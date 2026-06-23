// Historical season importer — SQL generator.
//
// Parses the pre-Supabase Google-Sheets exports (NFL 2022/2023/2024 .xlsx) and
// emits ONE self-contained, one-off `historical_import.sql` that loads the data
// into the canonical schema (seasons -> weeks -> games -> game_lines -> picks ->
// pick_settlement), all scoped to the original "Sunday Bets" group.
//
// This is intentionally a one-off (not a repeatable migration). It is, however,
// written to be safely re-runnable: every insert uses ON CONFLICT / NOT EXISTS.
//
// Usage:
//   pnpm db:import-historical:generate [inputDir] [--out path.sql]
//
// Settlement note: results come straight from the points the sheets already
// recorded (the group's own tally), NOT recomputed from final scores. ~half of
// 2023 has no final score but does have recorded points, and grade_pick() would
// also inject unwanted "missed" penalties. See issue #94 and the plan.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';
import { USER_COLUMNS } from '../backfill-picks/users.ts';

const GROUP_ID = '00000000-0000-4000-8000-000000000017'; // original "Sunday Bets" group

// Default location of the exported workbooks (they live in the main checkout).
const DEFAULT_INPUT_DIR = 'C:/Users/dough/code/sunday_bets/historical-spreadsheets';

// Player header label (full first name or initials) -> USER_COLUMNS key (initials).
const NAME_TO_INITIALS: Record<string, string> = {
  DH: 'DH',
  HM: 'HM',
  CD: 'CD',
  FP: 'FP',
  BP: 'BP',
  MC: 'MC',
  DOUG: 'DH',
  HARRY: 'HM',
  COLIN: 'CD',
  FRANK: 'FP',
  BRETT: 'BP',
  MIKE: 'MC'
};

const TEAMS = new Set([
  'ARI',
  'ATL',
  'BAL',
  'BUF',
  'CAR',
  'CHI',
  'CIN',
  'CLE',
  'DAL',
  'DEN',
  'DET',
  'GB',
  'HOU',
  'IND',
  'JAX',
  'KC',
  'LAC',
  'LAR',
  'LV',
  'MIA',
  'MIN',
  'NE',
  'NO',
  'NYG',
  'NYJ',
  'PHI',
  'PIT',
  'SEA',
  'SF',
  'TB',
  'TEN',
  'WAS'
]);

// Per-season Week 1 anchor = the Tuesday on/before the Week-1 Thursday kickoff.
// Real kickoff times are not in the sheets, so we synthesize Tue->Tue week windows;
// exact values only need to be in the past and group games into the right week.
const SEASONS: Array<{ year: number; anchor: string }> = [
  { year: 2022, anchor: '2022-09-06' },
  { year: 2023, anchor: '2023-09-05' },
  { year: 2024, anchor: '2024-09-03' }
];

type Weight = 'L' | 'M' | 'H' | 'A';
const WEIGHT_POINTS: Record<Weight, number> = { L: 1, M: 3, H: 5, A: 10 };

type GameRow = {
  ext: string;
  year: number;
  week: number;
  away: string;
  home: string;
  fav: string;
  spread: number;
  awayScore: number | null;
  homeScore: number | null;
  commence: Date;
};
type PickRow = {
  ext: string;
  initials: string;
  picked: string;
  weight: Weight;
  points: number | null;
};
type WeekRow = { year: number; week: number; start: Date; end: Date };

const warnings: string[] = [];

function toNum(v: unknown): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  const s = String(v ?? '').trim();
  if (!s) return undefined;
  return /^[-+]?\d+(?:\.\d+)?$/.test(s) ? Number(s) : undefined;
}

// Resolve a sheet weight token to the L/M/H/A enum. Falls back to inferring the
// tier from the recorded points magnitude when the token is unmappable (e.g. "S").
function resolveWeight(raw: string, points: number | null): Weight | undefined {
  const u = raw.trim().toUpperCase();
  if (u === 'L' || u === 'LOW') return 'L';
  if (u === 'M' || u === 'MED') return 'M';
  if (u === 'H' || u === 'HIGH' || u === 'BIG H' || u === 'H (TIE)') return 'H';
  if (u === 'A' || u === 'MORTGAGE' || u.startsWith('A')) return 'A'; // "A", "A 🔨"
  const mag = points == null ? undefined : Math.abs(points);
  if (mag === 1) return 'L';
  if (mag === 3) return 'M';
  if (mag === 5) return 'H';
  if (mag === 10) return 'A';
  return undefined;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function weekWindow(
  anchorISO: string,
  weekNumber: number
): { start: Date; end: Date; commence: Date } {
  const start = addDays(new Date(`${anchorISO}T00:00:00Z`), 7 * (weekNumber - 1));
  const end = addDays(start, 7);
  const commence = addDays(start, 5); // synthetic Sunday
  commence.setUTCHours(18, 0, 0, 0);
  return { start, end, commence };
}

function findWorkbook(dir: string, year: number): string {
  const match = readdirSync(dir).find(
    (f) => f.toLowerCase().endsWith('.xlsx') && f.includes(String(year))
  );
  if (!match) throw new Error(`No .xlsx for ${year} in ${dir}`);
  return path.join(dir, match);
}

function parseSeason(
  dir: string,
  year: number,
  anchor: string,
  games: GameRow[],
  picks: PickRow[],
  weeks: WeekRow[]
) {
  const file = findWorkbook(dir, year);
  const wb = xlsxRead(readFileSync(file), { type: 'buffer' });

  for (let wk = 1; wk <= 18; wk++) {
    const { start, end } = weekWindow(anchor, wk);
    weeks.push({ year, week: wk, start, end });
  }

  for (const sheetName of wb.SheetNames) {
    if (!/^Week\s+\d+$/i.test(sheetName)) continue; // skip "Totals"
    const wk = Number(sheetName.replace(/[^0-9]/g, ''));
    const { commence } = weekWindow(anchor, wk);
    const grid: unknown[][] = xlsxUtils.sheet_to_json(wb.Sheets[sheetName], {
      header: 1,
      defval: '',
      raw: true
    });
    if (!grid.length) continue;

    const hdr = (grid[0] ?? []).map((c) => String(c ?? '').trim());
    const outcomeCol = hdr.findIndex((h) => /^outcome$/i.test(h));
    if (outcomeCol < 0) continue; // weeks with no players recorded yet

    // Left pick columns are contiguous between Odds (col 1) and Outcome. The
    // right block repeats the same players in the same order starting at
    // outcomeCol + 1, so the i-th left player's points cell is outcomeCol+1+i.
    const players: Array<{ label: string; col: number; rightCol: number }> = [];
    for (let c = 2; c < outcomeCol; c++) {
      if (hdr[c])
        players.push({ label: hdr[c], col: c, rightCol: outcomeCol + 1 + players.length });
    }

    // Pair consecutive team-code rows (robust to irregular blank-row spacing).
    const teamRows: number[] = [];
    for (let r = 2; r < grid.length; r++) {
      const code = String(grid[r]?.[0] ?? '')
        .trim()
        .toUpperCase();
      if (TEAMS.has(code)) teamRows.push(r);
    }

    for (let i = 0; i + 1 < teamRows.length; i += 2) {
      const ar = teamRows[i];
      const hr = teamRows[i + 1];
      const away = String(grid[ar][0]).trim().toUpperCase();
      const home = String(grid[hr][0]).trim().toUpperCase();

      const awayLine = toNum(grid[ar][1]);
      const homeLine = toNum(grid[hr][1]);

      let fav = home;
      let spread = 0;
      if (awayLine !== undefined && awayLine < 0) {
        fav = away;
        spread = Math.abs(awayLine);
      } else if (homeLine !== undefined && homeLine < 0) {
        fav = home;
        spread = Math.abs(homeLine);
      } else if (awayLine === undefined && homeLine === undefined) {
        warnings.push(`${year} ${sheetName} ${away}@${home}: no line found, defaulting PK home`);
      } else {
        // Both present but neither negative (or both negative) -> pick'em / anomaly.
        warnings.push(
          `${year} ${sheetName} ${away}@${home}: unusual line signs (${awayLine}, ${homeLine}), defaulting fav=home spread=${spread}`
        );
      }

      const ext = `hist-${year}-${wk}-${away}-${home}`;
      games.push({
        ext,
        year,
        week: wk,
        away,
        home,
        fav,
        spread,
        awayScore: toNum(grid[ar][outcomeCol]) ?? null,
        homeScore: toNum(grid[hr][outcomeCol]) ?? null,
        commence
      });

      for (const p of players) {
        const wAway = String(grid[ar][p.col] ?? '').trim();
        const wHome = String(grid[hr][p.col] ?? '').trim();
        if (!wAway && !wHome) continue;
        if (wAway && wHome) {
          warnings.push(
            `${year} ${sheetName} ${away}@${home}: ${p.label} marked both sides, skipped`
          );
          continue;
        }
        const pickedAway = Boolean(wAway);
        const picked = pickedAway ? away : home;
        const raw = pickedAway ? wAway : wHome;
        const pickedRow = pickedAway ? ar : hr;
        const points = toNum(grid[pickedRow][p.rightCol]) ?? null;

        const weight = resolveWeight(raw, points);
        if (!weight) {
          warnings.push(
            `${year} ${sheetName} ${away}@${home}: ${p.label} weight "${raw}" unresolved (pts=${points}), skipped`
          );
          continue;
        }
        if (points != null && points !== 0 && Math.abs(points) !== WEIGHT_POINTS[weight]) {
          warnings.push(
            `${year} ${sheetName} ${away}@${home}: ${p.label} weight ${weight} but recorded pts=${points} (kept as recorded)`
          );
        }
        if (points == null) {
          warnings.push(
            `${year} ${sheetName} ${away}@${home}: ${p.label} picked ${picked} ${weight} but no recorded points (left unsettled)`
          );
        }

        const initials = NAME_TO_INITIALS[p.label.toUpperCase()];
        if (!initials) {
          warnings.push(`${year} ${sheetName}: unknown player header "${p.label}", skipped`);
          continue;
        }
        picks.push({ ext, initials, picked, weight, points });
      }
    }
  }
}

// ---- SQL emission -----------------------------------------------------------

function q(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}
function ts(d: Date): string {
  return `'${d.toISOString().replace('T', ' ').replace('.000Z', '+00')}'`;
}
function n(v: number | null): string {
  return v == null ? 'null' : String(v);
}

function valuesBlock(rows: string[]): string {
  // chunk into batches for readability; Postgres handles big multi-row inserts fine
  const out: string[] = [];
  const SIZE = 500;
  for (let i = 0; i < rows.length; i += SIZE) {
    out.push(rows.slice(i, i + SIZE).join(',\n'));
  }
  return out.join(',\n');
}

function buildSql(games: GameRow[], picks: PickRow[], weeks: WeekRow[]): string {
  const userValues = (Object.keys(USER_COLUMNS) as Array<keyof typeof USER_COLUMNS>)
    .map((k) => `  (${q(String(k))}, ${q(USER_COLUMNS[k])}::uuid)`)
    .join(',\n');

  const weekValues = valuesBlock(
    weeks.map((w) => `  (${w.year}, ${w.week}, ${ts(w.start)}, ${ts(w.end)})`)
  );
  const gameValues = valuesBlock(
    games.map(
      (g) =>
        `  (${q(g.ext)}, ${g.year}, ${g.week}, ${q(g.away)}, ${q(g.home)}, ${q(g.fav)}, ${g.spread}, ${n(g.awayScore)}, ${n(g.homeScore)}, ${ts(g.commence)})`
    )
  );
  const pickValues = valuesBlock(
    picks.map(
      (p) => `  (${q(p.ext)}, ${q(p.initials)}, ${q(p.picked)}, ${q(p.weight)}, ${n(p.points)})`
    )
  );

  return `-- Historical season import (NFL 2022-2024) -- GENERATED by
-- supabase/scripts/import-historical/generate.ts. Do not edit by hand.
--
-- One-off data load. Run once against staging, verify, then production.
-- Settlement points come straight from the sheets' recorded points (no
-- missed-pick penalties; grade_season is intentionally NOT used).
--
-- Games: ${games.length} | Picks: ${picks.length} | Group: ${GROUP_ID}

begin;

-- 1) Seasons -----------------------------------------------------------------
insert into public.seasons (league, year)
values ('NFL', 2022), ('NFL', 2023), ('NFL', 2024)
on conflict (league, year) do nothing;

-- 2) Weeks -------------------------------------------------------------------
create temp table _w (year int, week_number int, start_ts timestamptz, end_ts timestamptz) on commit drop;
insert into _w (year, week_number, start_ts, end_ts) values
${weekValues};

insert into public.weeks (season_id, week_number, start_ts, end_ts)
select s.id, w.week_number, w.start_ts, w.end_ts
from _w w
join public.seasons s on s.league = 'NFL' and s.year = w.year
on conflict (season_id, week_number) do nothing;

-- 3) Games -------------------------------------------------------------------
create temp table _g (
  ext text, year int, week int, away text, home text, fav text,
  spread numeric, away_score int, home_score int, commence timestamptz
) on commit drop;
insert into _g (ext, year, week, away, home, fav, spread, away_score, home_score, commence) values
${gameValues};

insert into public.games (external_game_id, week_id, commence_time, home_team_id, away_team_id, status, final_scores)
select
  g.ext, w.id, g.commence, ht.id, at.id, 'final',
  case when g.home_score is not null and g.away_score is not null
       then jsonb_build_object('home', g.home_score, 'away', g.away_score) end
from _g g
join public.seasons s on s.league = 'NFL' and s.year = g.year
join public.weeks w on w.season_id = s.id and w.week_number = g.week
join public.teams ht on upper(ht.short_name) = g.home
join public.teams at on upper(at.short_name) = g.away
on conflict (external_game_id) do nothing;

-- 4) Active lines (one per game) ---------------------------------------------
insert into public.game_lines (game_id, source, spread_team_id, spread_value, is_active_line, fetched_at)
select gm.id, 'fanduel', ft.id, g.spread, true, gm.commence_time
from _g g
join public.games gm on gm.external_game_id = g.ext
join public.teams ft on upper(ft.short_name) = g.fav
where not exists (
  select 1 from public.game_lines gl where gl.game_id = gm.id and gl.is_active_line
);

-- 5) Player -> user map ------------------------------------------------------
create temp table _u (initials text, user_id uuid) on commit drop;
insert into _u (initials, user_id) values
${userValues};

-- 6) Picks -------------------------------------------------------------------
create temp table _p (ext text, initials text, picked text, weight text, points int) on commit drop;
insert into _p (ext, initials, picked, weight, points) values
${pickValues};

insert into public.picks (
  id, group_id, user_id, game_id, picked_team_id, weight,
  locked_at, locked_line_id, locked_spread_team_id, locked_spread_value, locked_by
)
select
  gen_random_uuid(), ${q(GROUP_ID)}::uuid, u.user_id, gm.id, pt.id, p.weight::public.weight_enum,
  gm.commence_time, gl.id, gl.spread_team_id, gl.spread_value, u.user_id
from _p p
join public.games gm on gm.external_game_id = p.ext
join _u u on u.initials = p.initials
join public.teams pt on upper(pt.short_name) = p.picked
join public.game_lines gl on gl.game_id = gm.id and gl.is_active_line
on conflict (group_id, user_id, game_id) do nothing;

-- 7) Settlement from recorded points (no missed penalties) -------------------
insert into public.pick_settlement (group_id, user_id, game_id, pick_id, points_delta, outcome, graded_at)
select
  pk.group_id, pk.user_id, pk.game_id, pk.id, p.points,
  (case when p.points > 0 then 'win' when p.points < 0 then 'loss' else 'push' end)::public.pick_outcome,
  now()
from _p p
join public.games gm on gm.external_game_id = p.ext
join _u u on u.initials = p.initials
join public.picks pk
  on pk.game_id = gm.id and pk.user_id = u.user_id and pk.group_id = ${q(GROUP_ID)}::uuid
where p.points is not null
on conflict (group_id, user_id, game_id) do nothing;

commit;
`;
}

// ---- main -------------------------------------------------------------------

function main() {
  const argv = process.argv.slice(2);
  const inputDir = argv.find((a) => !a.startsWith('--')) ?? DEFAULT_INPUT_DIR;
  const outIdx = argv.findIndex((a) => a === '--out' || a.startsWith('--out='));
  let outPath = path.join('supabase', 'scripts', 'import-historical', 'historical_import.sql');
  if (outIdx !== -1) {
    const a = argv[outIdx];
    outPath = a.includes('=') ? a.slice(a.indexOf('=') + 1) : argv[outIdx + 1];
  }

  const games: GameRow[] = [];
  const picks: PickRow[] = [];
  const weeks: WeekRow[] = [];

  for (const { year, anchor } of SEASONS) {
    parseSeason(inputDir, year, anchor, games, picks, weeks);
  }

  const sql = buildSql(games, picks, weeks);
  writeFileSync(path.resolve(outPath), sql, 'utf8');

  // Review report ------------------------------------------------------------
  const perYear = (arr: Array<{ year?: number; ext?: string }>) => {
    const m = new Map<number, number>();
    for (const x of arr) {
      const y = x.year ?? Number(x.ext!.split('-')[1]);
      m.set(y, (m.get(y) ?? 0) + 1);
    }
    return [...m.entries()]
      .sort()
      .map(([y, c]) => `${y}=${c}`)
      .join(' ');
  };
  const scored = games.filter((g) => g.awayScore != null && g.homeScore != null).length;
  const settled = picks.filter((p) => p.points != null).length;

  console.log(`\n=== Historical import generated -> ${outPath} ===`);
  console.log(`Games:        ${games.length}  (${perYear(games)})`);
  console.log(`  with score: ${scored}  (missing final score: ${games.length - scored})`);
  console.log(`Weeks:        ${weeks.length}`);
  console.log(`Picks:        ${picks.length}  (${perYear(picks)})`);
  console.log(`Settlements:  ${settled}  (picks w/o recorded points: ${picks.length - settled})`);
  console.log(`\nReview notes: ${warnings.length}`);
  for (const w of warnings) console.log(`  - ${w}`);
}

main();

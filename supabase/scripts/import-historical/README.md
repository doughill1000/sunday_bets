# Historical Import — NFL 2022/2023/2024

One-off import of three pre-Supabase Google-Sheets seasons into the canonical
schema, scoped to the original "Sunday Bets" group `00000000-0000-4000-8000-000000000017`.
Tracks GitHub issue #94.

## Files

| File                    | Purpose                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `generate.ts`           | Node generator — parses `.xlsx` workbooks, emits `historical_import.sql`, prints a review report (counts + edge-case warnings) |
| `historical_import.sql` | **Generated artifact** — do not hand-edit; re-run the generator if the source workbooks change                                 |

## Commands

Generate the SQL (safe to re-run; overwrites the artifact):

```sh
pnpm db:import-historical:generate
```

Reads workbooks from `C:/Users/dough/code/sunday_bets/historical-spreadsheets/` by
default (pass an optional input-dir arg to override). Prints a review report on
completion.

Run the import (Git Bash, from repo root):

```sh
DBURL=$(grep -E '^DATABASE_URL=' .env.staging | cut -d= -f2- | tr -d '"')
psql "$DBURL" -v ON_ERROR_STOP=1 -f supabase/scripts/import-historical/historical_import.sql
```

Repeat against `.env.production` once staging is verified. The SQL can also be
pasted into the Supabase SQL editor. The file is a single `BEGIN`/`COMMIT`
transaction with `ON CONFLICT DO NOTHING` on every insert — atomic and safely
re-runnable.

This writes `pick_settlement` rows directly (see "Settlement design" below), bypassing the
app's grading path that normally rebuilds the credibility rating read model afterward — so
`public.player_ratings` is left stale for these seasons until the next live grade unless you
rebuild it explicitly (issue #619, ADR-0032 §8):

```sh
pnpm ratings:rebuild -- --env=.env.staging     # then --env=.env.production
```

## Settlement design

Points come directly from the per-player points columns already recorded in the
sheets — **not** recomputed via `grade_pick`/`grade_season`. Reasons:

- ~half of 2023 games have no final score recorded (only points)
- `grade_season` would inject "missed-pick" penalties for players not yet in the
  group in early-2022 weeks

There are **no missed-pick penalties** in this import. Each pick's `points_delta`
and win/loss/push are taken from the recorded points cell on the player's row.

## Spreadsheet quirks the generator handles

- 2022/2023 player columns are full names (`Doug`/`Harry`/etc.); 2024 uses initials
  (`DH`/`HM`/etc.) — both mapped to the six user UUIDs in `../backfill-picks/users.ts`
- `Totals` tab is skipped for import but used as the verification oracle
- `Outcome` (score) column position varies; detected by header, not hardcoded
- Weight normalization: `L/M/H/A`, lowercase, word forms (`High/Med/Low`), and
  oddballs (`mortgage`, `A 🔨`, `Big H`, `H (tie)`) all map to `L/M/H/A`; the four
  `S` cells are resolved by inferring tier from points magnitude (`|1|=L`, `|3|=M`,
  `|5|=H`, `|10|=A`)

## Generated volume

799 games · 54 weeks (18 per season) · 3,823 picks · 3,811 settlements  
(12 picks had no recorded points and are intentionally left unsettled; 134 games
have no final score — settlement still works because it comes from recorded points)

## Verification

Per-player season `total_points` from `leaderboard_season_totals` must equal the
per-week point sums on each workbook's `Totals` tab. Confirmed exact on staging for
all three seasons and all six players.

Also confirm stats views return rows for 2022–2024: `leaderboard_season_totals`,
`leaderboard_weekly_cumulative`, `stats_season_trend`, `stats_accuracy_by_team`,
`stats_accuracy_by_weight`, `stats_head_to_head`.

Quick spot-check query:

```sql
select l.season_year, u.display_name, l.total_points, l.wins, l.losses, l.pushes
from public.leaderboard_season_totals l
join public.users u on u.id = l.user_id
where l.season_year in (2022, 2023, 2024)
order by l.season_year, l.total_points desc;
```

## Status

Imported and verified on **staging** (ref `eoncckeqqogezoftooix`). Production import
is the remaining step — run the psql command above against `.env.production`.

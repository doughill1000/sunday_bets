# Historical kickoff-time backfill — NFL 2022/2023/2024

One-off, data-only patch that replaces the **synthetic** kickoff times on imported
historical games with the **real** ESPN kickoff time, so the `/league` primetime
module has genuine TNF/SNF/MNF data for these seasons.

## Why this exists

`import-historical/generate.ts` had no real kickoff times in the source
spreadsheets, so it synthesized `commence_time` as a flat **Sunday 18:00 UTC
(= 2:00pm ET)** for _every_ game in a week. The `/league` primetime split
(`league_ats_primetime` view) classifies TNF/SNF/MNF/day purely from
`commence_time` in `America/New_York`, so every imported game currently buckets as
`day` — those three seasons show **zero** primetime games, which is wrong, not
merely sparse.

## Files

| File                      | Purpose                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `generate.ts`             | Fetches real kickoff times from the ESPN scoreboard (`fetchEspnWeek`), emits `backfill_game_times.sql` |
| `backfill_game_times.sql` | **Generated artifact** — do not hand-edit; re-run the generator to refresh it                          |

## How it matches

ESPN events are matched to our rows on the durable game identity — **week +
unordered team pair** (the `uq_games_matchup` key) — so a home/away disagreement
between providers cannot cause a mismatch. Team abbreviations are normalized to
`teams.external_key` by `fetchEspnWeek` (`WSH→WAS`, `JAC→JAX`).

The `UPDATE` touches only `commence_time` and `schedule_game_id` on already-final
historical games. It is safe:

- Week membership is by `week_id` FK (not by time) — nothing reshuffles between weeks.
- Settled picks carry their own stored `locked_at`; moving `commence_time` does not
  re-open or re-grade anything.
- `schedule_game_id` is a plain observability/re-sync attribute (no unique
  constraint) — populating it is a free bonus for future re-syncs.

## Commands

Generate the SQL (fetches 2022–2024 × 18 weeks from ESPN; safe to re-run):

```sh
pnpm db:backfill-game-times:generate
```

Run it (Git Bash, from repo root) — **staging first**, verify, then production:

```sh
DBURL=$(grep -E '^DATABASE_URL=' .env.staging | cut -d= -f2- | tr -d '"')
psql "$DBURL" -v ON_ERROR_STOP=1 -f supabase/scripts/backfill-game-times/backfill_game_times.sql
```

The file is one `BEGIN`/`COMMIT` transaction (idempotent `UPDATE`) followed by a
separate `select public.refresh_leaderboard_stats();` that rebuilds
`league_ats_base` **CONCURRENTLY** (which is why it runs after `COMMIT`, on its own).
It can also be pasted into the Supabase SQL editor.

## Verification

The `DO` block near the end raises two notices — both should be `0` on a clean run:

- `ESPN rows unmatched to a game` — ESPN events with no corresponding game row
- `Historical games still on synthetic time (uncovered)` — our games ESPN did not cover

Spot-check that the primetime split now has real slots for the backfilled seasons:

```sql
select season_year, slot, games, favorite_covers, underdog_covers, pushes
from public.league_ats_primetime
where season_year in (2022, 2023, 2024)
order by season_year, slot;
```

Before the patch every season returns a single `day` row; after, each season
returns `TNF`/`SNF`/`MNF`/`day` rows.

## Status

Generated. Not yet applied to staging or production.

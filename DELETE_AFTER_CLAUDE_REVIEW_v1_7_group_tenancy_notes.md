# Delete After Claude Review: v1.7 Group Tenancy Notes

This file is intentionally temporary. It captures implementation concerns and
decisions from the #98 `group_id` picks / settlement work for Claude to review,
then delete.

## Decisions Made

- Branched from `v1.7---group-tenancy` into
  `codex/98-group-id-picks-settlement`.
- Kept the existing `picks.id` surrogate identifier and preserved it as a unique
  FK target because existing code and `pick_settlement.pick_id` depend on it.
- Made the group-scoped logical key `(group_id, user_id, game_id)` for `picks`
  and `pick_settlement`, matching the issue's tenancy intent while avoiding a
  broad app rewrite in this slice.
- Added a stable original group ID in the migration:
  `00000000-0000-4000-8000-000000000017`.
- Pulled a minimal original-group backfill into this issue because enforcing
  `NOT NULL` and the new composite keys could not apply cleanly to a DB with
  existing picks otherwise.
- Updated `lock_pick()`, `unlock_pick()`, and `_grade_games_by_ids()` to resolve
  the user's first membership and scope pick writes / missed-pick settlement by
  that group.
- Granted `authenticated` read access to `pick_settlement`; RLS now constrains
  rows via `is_member(group_id)`.
- Explicitly re-granted `is_member(uuid)` in `player_grants.sql` because that
  file revokes function access broadly before re-granting player-callable
  functions.

## Concerns For Review

- Issue #101 originally owns the full original-group backfill and standings
  parity check. This branch does a minimal backfill so #98 can satisfy `NOT NULL`
  and local migration apply criteria. Claude should decide whether that scope
  split is acceptable or whether #98/#101 should be reworded.
- The selected group resolution is currently "first membership by joined_at,
  group_id". That is fine for invisible v1.7 sole-membership behavior, but it is
  not a long-term group-switching model.
- `lock_pick()` returns no `group_id`; app code may need to thread selected
  group explicitly in #102 or a later follow-up.
- The leaderboard and stats views remain mostly not group-aware here by design
  because issue #99 owns that work. Existing service-role-only stats tests were
  updated only enough to satisfy the new schema.
- The migration generator produced several small migrations because local apply
  uncovered issues iteratively. They are generated, not hand-edited, but Claude
  may want to review whether squashing/regenerating is preferred before PR.
- `supabase test db` required an explicit `--db-url` locally; `--local` failed
  at the CLI connection layer even though `db push --local` worked.
- Corepack `pnpm` failed due to a local shim/PATH issue, so verification used
  repo-local binaries directly.

## Verification Run

- `supabase db push --local --yes` passed.
- `supabase test db --db-url postgresql://postgres:postgres@127.0.0.1:54322/postgres`
  passed with 101 tests.
- `vitest --run --config vitest.integration.config.ts` passed with 9 tests.
- `tsx supabase/scripts/generate-migration.ts --check` passed.
- `git diff --check` passed.
- Targeted eslint on touched integration tests passed.
- Full eslint still fails on unrelated pre-existing files.
- Full Prettier check still fails on unrelated pre-existing files.

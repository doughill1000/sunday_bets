# Pattern audit — 2026-07-02

Repo-wide maturity grading of established patterns against the repo's own documented
standards (`AGENTS.md`, the ADRs under `docs/adr/`, and the `docs/agent-context/`
packs). One subagent per lane graded two axes — **conformance** (does the code follow
the documented rule?) and **pattern quality** (is the pattern itself worth keeping?) —
with `path:line` evidence for every finding. Follow-up to the
[2026-06-26 audit](2026-06-26-pattern-audit.md); several lanes verified that audit's
findings were since remediated.

- **HEAD at audit time:** `b062d97` on `chore/merge-dependabot-updates` (clean tree;
  only dependency/formatting commits ahead of `master`, so results apply to `master`).
- **Rubric snapshot:** 18 ADRs (0001–0018, next is 0019); 4 agent-context packs.
- **Models:** Sonnet per lane; Opus for the cross-cutting Auth/RLS and
  Delivery-governance lanes.

## Scorecard

| Lane                          | Maturity | One-line justification                                                                                                                       |
| ----------------------------- | :------: | -------------------------------------------------------------------------------------------------------------------------------------------- |
| UI / frontend                 |    4     | Runes/vendoring conformance clean (prior audit fully remediated); async-status boilerplate duplicated 13× caps it                            |
| Server / backend              |    4     | Service-role and admin boundaries hold; queries/commands split violated in two files; API-route layer has no standard                        |
| DB SQL source                 |    4     | ADR-0002 tenancy/index rules followed with strong "why" comments; legacy `0300_rls.sql` duplicates the policy layer                          |
| Migrations & ledger           |    4     | History and ledger drift-free today; integrity check silently skips fully-superseded migrations                                              |
| Auth / RLS / grants           |    4     | Admin boundary and closed-by-default baseline exemplary and pgTAP-guarded; RLS policy layer has a split source of truth                      |
| Workflows / CI / deploy       |    4     | ADR-0010 release ritual implemented faithfully; the amendment that deleted `migrate-db.yml` never reached `clone-to-staging.yml`             |
| Tests (4 tiers)               |    4     | Layering/isolation/E2E-pillar discipline strong; docs misstate the CI gating set and coverage thresholds are dead config                     |
| Types & config / tooling      |    4     | Configs faithfully implement documented policies; no `packageManager` field, minor naming/duplication friction                               |
| Delivery / process governance |    3     | Governance model well-designed, but ADR-status flips and per-PR changelog entries — the two manual freshness steps — both lapsed across v2.8 |

## Executive summary

No lane reported a P0. Eight of nine lanes graded 4 ("strong — minor drift"); the code
itself is in better shape than the paperwork around it. The cross-cutting themes:

1. **The docs are drifting behind the code, and the drift is systemic, not random.**
   Nearly every P1 in this audit is documentation or status staleness rather than a
   code defect: `testing.md`/`AGENTS.md` still say only unit tests gate PRs (the
   require-ci work made integration and pgTAP gate too), `README.md` points at the
   deleted `migrate-db.yml`, four shipped ADRs (0013, 0015, 0016, 0018) are still
   `Proposed` — including one that other docs cite as binding law and one that
   ADR-0005 already declares itself superseded by — and the v2.8 PR cluster skipped
   the per-PR changelog rule. The root cause is the governance lane's P1: ADR-status
   flips and changelog entries are manual `finish-pr` steps with **no CI gate**, so
   they lapse silently whenever a PR skips the skill. Patching that one enforcement
   gap fixes the class, not just the instances.

2. **The ADR-0010 amendment was only half-propagated.** Folding `migrate-db.yml`
   into `deploy-prod.yml` left `clone-to-staging.yml` waiting on a workflow that no
   longer exists (its "abort if prod migration failed" guard is now a silent no-op)
   while still pushing migrations to staging on every merge to master — so staging
   schema can run ahead of prod for weeks and then receive prod's data dump into a
   mismatched schema. This is the closest thing to a P0 in the audit and the top
   code fix.

3. **The security boundary has one split source of truth.** Two lanes independently
   flagged `supabase/src/schemas/0300_rls.sql`: it duplicates the RLS enables and
   policies now owned by `supabase/src/policies/*`, loses at apply time (policies
   phase runs later), and has already diverged (it lacks `del_picks_own_pre` and all
   newer policies). Everything else about the auth boundary — three-way admin
   consistency, the closed-by-default function ACL guard, service-role confinement —
   graded exemplary; this is the one blemish, and it sits on the tenancy boundary.

4. **The verification guards have quiet blind spots.** The hash-ledger integrity
   check only re-hashes migrations a _current_ ledger entry still references, so five
   fully-superseded migration files are no longer tamper-evident — and the
   drift-verify gate deliberately ignores `GRANT`/`REVOKE`, so a hand-edit to a grant
   in one of them would evade both guards. Similarly, vitest coverage thresholds
   exist in both configs but no CI job ever runs `--coverage`, and no pgTAP test
   asserts set-based that every `public` table has RLS enabled. Each guard works for
   what it checks; the gaps are in what silently falls outside.

5. **Growth areas lack a written convention, and duplication is filling the vacuum.**
   The async-status-message pattern is hand-copied 13× across three routes with three
   different conventions; 14 of ~35 API routes do inline DB calls outside the
   queries/commands split (untested, unlike their wrapped siblings);
   `SUPABASE_CLI_VERSION` is pasted into 8 workflow files; integration suites each
   re-implement teardown; index file placement (inline vs `indexes/`) has no rule.
   None is urgent alone — together they are the maintainability tax the next season
   of features will pay.

## Prioritized recommendations

No P0s. P1s first, merged across lanes:

### P1

1. **Fix `clone-to-staging.yml` for the post-ADR-0010-amendment world** (Workflows) —
   `.github/workflows/clone-to-staging.yml:58,70,87` waits on the deleted
   `migrate-db.yml` (silent no-op guard) and `:4-6,96-99` pushes migrations to
   staging on every master merge, letting staging schema run ahead of prod before
   restoring prod's data into it. Key the guard off `deploy-prod.yml`'s `migrate`
   job and gate the clone on the release signal. Also fix the stale pointer at
   `README.md:136` (Migrations lane, P2 there — same root cause).
2. **Collapse `supabase/src/schemas/0300_rls.sql` to a no-op/header** (DB SQL +
   Auth/RLS, found independently by both) — `supabase/src/schemas/0300_rls.sql:1-93`
   duplicates and has drifted from `supabase/src/policies/*`; make `policies/` the
   sole owner of the RLS surface, backed by an explicit no-op migration.
3. **Ratify the shipped ADRs and repair the changelog** (Delivery) — flip ADR-0013,
   0015, 0016, 0018 to `Accepted` (`docs/adr/00NN-*.md:3`); that also fixes the
   inconsistent supersession chain (0005 is marked superseded by a still-Proposed 0018) and stops `AGENTS.md:131`/`docs/WORKFLOW.md:181` citing unratified
   decisions. Backfill the missing v2.8 per-PR entries and the `PR #NNN` placeholder
   in `docs/CHANGELOG.md:55-62`.
4. **Add a CI freshness gate for the manual governance steps** (Delivery,
   pattern-quality) — fail CI when an ADR's linked issue is closed but its status is
   still `Proposed`, and flag merged PRs absent from `docs/CHANGELOG.md`. This is
   the class fix for theme 1; without it, items like #3 recur every milestone.
5. **Close the ledger's orphaned-migration blind spot** (Migrations) —
   `supabase/scripts/generate-migration.ts:195-225` only validates migrations still
   referenced by a live ledger entry; five superseded migration files are currently
   unverified, and `verify-src-reproduces-migrations.ts:98-119` ignores ACL lines.
   Add a full-directory sha256 manifest independent of live ledger references.
6. **Correct the CI-gating description in the testing docs** (Tests) —
   `docs/agent-context/testing.md:13` and `AGENTS.md:150-156` say unit is the only
   PR-gating layer; `ci-integration.yml` and `ci-pgtap.yml` now gate PRs (with
   always-report gate jobs). Document the real set: lint/unit/build always,
   integration/pgTAP path-filtered-required, e2e smoke required.
7. **Extract the async-status-message pattern in the UI** (UI) — 13 hand-copied
   `{kind, text} | null` + busy-flag + status-border blocks across
   `src/routes/(app)/group/+page.svelte`, `settings/+page.svelte`, and
   `admin/+page.svelte` in three different conventions. Extract a rune-based
   `useAsyncAction()` helper plus a shared `<StatusMessage>` component.

### P2

8. **Enforce (or delete) the coverage thresholds** (Tests) — thresholds in
   `vitest.config.ts:59-64` / `vitest.integration.config.ts:38-43` are dead config;
   no CI job passes `--coverage`. Wire `pnpm test:coverage` into CI or remove them.
9. **Add a set-based RLS-enabled pgTAP assertion** (Auth/RLS) — nothing asserts
   every `public` table has `relrowsecurity = true`; under closed-by-default grants,
   a new granted table missing its enable line means full-table reads for
   `authenticated`. One query over `pg_class` closes it.
10. **Move the three write functions out of `db/queries/`** (Server) —
    `src/lib/server/db/queries/recaps.ts:77`, `seasonWrapped.ts:35,134` violate the
    documented reads/writes split; relocate to `db/commands/`.
11. **Decide and document the API-route DB-access convention** (Server) — 14 of ~35
    `+server.ts` handlers issue inline Supabase calls with no unit-test tier, while
    siblings go through `db/queries`/`db/commands`. Either extend the wrapper
    convention to route mutations or document route-inline as sanctioned for
    RLS-scoped single-table writes.
12. **De-duplicate index declarations and pick a placement rule** (DB SQL) —
    `idx_pick_settlement_game` and `idx_picks_group_game_user` are each declared
    twice (schema file + `indexes/`); keep `indexes/` as the owner for base-table
    indexes and codify the matview-indexes-stay-inline exception in
    `docs/agent-context/database.md`.
13. **Extract workflow duplication** (Workflows) — `SUPABASE_CLI_VERSION` pasted in
    8 files (→ repo variable) and the ~10-line Postgres-17-client install block
    duplicated in `deploy-prod.yml:54-64` / `clone-to-staging.yml:28-37` (→ local
    composite action).
14. **Add `"packageManager"` to `package.json`** (Types/config) — AGENTS.md tells
    Codex to activate `pnpm@<repo-version>` but no authoritative version exists
    outside CI workflow yaml.
15. **Stop re-enumerating milestone PRs in the release-summary changelog line**
    (Delivery) — `docs/CHANGELOG.md:55` duplicates (and already disagrees with) the
    standalone entries; link the GitHub Release/milestone instead, or generate the
    line at `cut-release` time.
16. **Shared integration-test teardown helper** (Tests) — 18 integration suites
    each re-implement tag-based cleanup against the 647-line `fixtures/db.ts`;
    mirror the e2e `seed.ts` pattern with a `resetForSuite(tag)` helper.
17. **Re-sync `OddsSyncCard.svelte` local state when the prop changes** (UI) —
    `src/lib/components/admin/OddsSyncCard.svelte:20` seeds `$state` once and
    diverges thereafter; add the guarded resync `WeightSelect.svelte` documents.
18. **Annotate the intentional ADR-0002 index exceptions** (DB SQL) — `recap_seen`
    and `notification_log` key user-first by design; one-line comments prevent a
    future "fix" into a regression.

### P3 (selected)

19. Reword `docs/agent-context/auth.md:29` — service-role imports legitimately live
    in `*.server.ts`/`+server.ts`, not only `src/lib/server/**` (Auth/RLS).
20. Record the enum-lockdown divergence back into ADR-0011 as a follow-up, and
    consolidate enum ACLs from three files to one (Auth/RLS).
21. Add a re-squash trigger (file count / bytes / cadence) to ADR-0012 or
    `database.md` — 21 migrations / ~180KB accumulated in 6 days post-baseline
    (Migrations).
22. Prefer explicit `-- @signature:` headers for function-signature changes; the
    generator's regex-based signature-drop silently skips zero/multi-match files
    (Migrations).
23. Clarify AGENTS.md "mirrored server-side" wording for `domain/rules.ts`, or add
    a thin server-side guard before the `lock_pick_all_groups` RPC (Server).
24. Add Sentry capture to the silent-default error branches in
    `src/lib/server/admin.ts:37-41,52-57` (Server).
25. Confirm the `Production` environment used by `migrate-dry-run.yml:52-53` has
    required-reviewer protection (Workflows).
26. Trim/justify the `@smoke` set (8 tests vs the documented ~5–6 budget) (Tests).
27. Housekeeping: `ci-tests.yml:1` header names the wrong file; `.gitignore:9`
    ignores a nonexistent file; `.npmrc` `engine-strict` with no `engines` field;
    `refresh-wrapped:prod` breaks the `db:<verb>:<env>` naming; `server.ts` vs
    `server/` naming collision under `src/lib/types/`; redundant
    `moduleResolution` in `tsconfig.json:12`; missing tsconfig-strictness standard
    (flagged as missing standard, not violation).

## Per-lane grade blocks

### UI / frontend — Maturity: 4

**Justification:** Conformance is strong — every prior audit violation (prop mutation, dead store, duped constant, global CSS scope) was fixed in `de8808b`, no legacy Svelte 4 idioms or `tailwind.config.js` exist, and vendored `ui/` is untouched — but a real, growing duplication in the async-status-message pattern caps it below exemplary.
**Conformance findings** (drift from documented standards):

- [P3] No conformance drift found in this pass — `src/lib/components/ui/` remains untouched since its two vendoring commits (`git log -- src/lib/components/ui/` shows only `55874b3` and `b1da837`, both additive), `eslint.config.js:14` still excludes it, and no `.svelte` file under scope uses `export let`, `$:`, or `createEventDispatcher` — recorded here only because the rubric requires an explicit conformance line even when the result is clean.

**Pattern-quality findings** (maintainability / scalability of the pattern itself):

- [P1] The `{kind, text} | null` async-status-message pattern (busy flag + message state + a hand-copied `class:border-success/border-warning/border-destructive` markup block) is duplicated 13 times with zero shared abstraction — 7× in `src/routes/(app)/group/+page.svelte` (e.g. `:59`, `:68`, `:81`, `:85`, `:89`, `:98`, `:103` plus matching markup at `:433-441`, `:471-479`, `:511-519`, `:590-598`, `:628-636`, `:766-774`, `:838-846`), 5× in `src/routes/(app)/settings/+page.svelte` (`:19`, `:34`, `:39`, `:147`, `:205` and matching markup blocks), and once more in `src/routes/(app)/admin/+page.svelte:22-26,56-65` via a different callback-prop convention — three different call sites solve the identical UX problem three different ways. — extract a `useAsyncAction()` rune-based helper (busy/message/run) plus a shared `<StatusMessage msg={...}/>` component, and standardize on one convention (callback-prop like admin's, or local state like group's) so a 10th commissioner setting doesn't repeat another ~15 lines of boilerplate.
- [P2] `src/lib/components/admin/OddsSyncCard.svelte:20` seeds `localSettings = $state({ ...settings })` once from the `settings` prop and never re-syncs it if the prop changes after the initial render (e.g. another admin's concurrent sync or a background revalidation) — low risk today given the single-admin usage pattern, but the same one-shot-seed-then-diverge shape will bite as soon as this data is shared/revalidated elsewhere — add a `$effect(() => { localSettings = { ...settings }; })` guarded on a stable key, mirroring the resync `WeightSelect.svelte` already documents for its writable-`$derived`.

**Strengths:** Svelte 5 runes usage is exemplary and consistent (props, `$state`/`$derived`/`$derived.by`/`$effect`, snippets) with no legacy idiom mixing anywhere in scope; `src/routes/+layout.svelte` and `src/routes/(app)/group/+page.svelte` show a mature, well-commented TanStack Query + SSR-initialData caching convention (ADR-0017) worth propagating to any new data-heavy route; the team demonstrated real audit-driven remediation — `de8808b` closed out every finding from the prior 2026-06-26 UI audit within a day.

### Server / backend — Maturity: 4

**Justification:** The documented boundaries (service-role confinement, admin fresh-recheck, cookie-session auth, TS/SQL rule mirroring) are followed consistently and well-commented, but the `db/queries` vs `db/commands` read/write split is violated in two files and the API-route layer has no documented pattern of its own.

**Conformance findings** (drift from documented standards):

- [P2] `db/queries/recaps.ts` and `db/queries/seasonWrapped.ts` contain writes (`upsert`/`insert`/`delete`), contradicting AGENTS.md's stated split "`db/queries/` (reads) and `db/commands/` (writes)" — `src/lib/server/db/queries/recaps.ts:77` (`upsertRecap`), `src/lib/server/db/queries/seasonWrapped.ts:35` (`deleteSeasonWrappedRow`), `src/lib/server/db/queries/seasonWrapped.ts:134` (`insertSeasonWrapped`) — move these three functions into `db/commands/recaps.ts` / `db/commands/seasonWrapped.ts`, keeping the read functions where they are.
- [P3] `src/lib/domain/rules.ts` (kickoff/All-In logic) is used only client/UI-side (`src/routes/(app)/picks/+page.server.ts`, `WeightSelect.svelte`, `PicksSummaryBar.svelte`) with no equivalent TS check on the server request path before delegating to the RPC — `src/routes/(app)/api/picks/[gameId]/+server.ts:35` calls `lock_pick_all_groups` directly with no pre-check, relying entirely on `supabase/src/functions/picks/lock_pick.sql:64` for enforcement. This matches AGENTS.md's "mirrored server-side and in SQL" only if "server-side" is read as "the SQL function," which is ambiguous — clarify the doc wording or add a thin server-side guard so the mirror is actually three-way (UI, server, SQL) as documented.

**Pattern-quality findings** (maintainability / scalability of the pattern itself):

- [P2] No documented convention governs where API-route (`+server.ts`) database logic should live: 14 of ~35 files under `src/routes/(app)/api/**` issue `supabase`/`supabaseService` calls inline (e.g. `src/routes/(app)/api/comments/[gameId]/+server.ts:22-24,47`, `src/routes/(app)/api/push/subscribe/+server.ts:20-30,44-47`) rather than through a `db/commands` wrapper, while sibling functionality (e.g. `getCommentsForGame.ts`) does live in `db/queries`. These inline writes have no unit tests (only `db/commands/*` and `db/queries/*` have `__tests__/`), splitting the same feature's read and write paths across two different testability tiers. This is a missing-standard gap, not a rule violation — recommend either extending the `db/queries`/`db/commands` convention to cover all route-level mutations or explicitly documenting route-inline calls as the sanctioned pattern for RLS-scoped, single-table writes.
- [P3] `src/lib/server/admin.ts:37-41,52-57` swallows Supabase errors into silent defaults (e.g. `getSettingsSummary` falls back to `cap:1000, used:0` on any query error, `getGameplaySettings` defaults `finalWeekUnlimitedAllin: true` on error) with no logging/Sentry capture, unlike the fail-closed pattern used in `requireAdmin` (`src/lib/server/auth.ts:29-31`). At small scale this is low-risk, but it masks real outages behind a plausible-looking value — worth at least a `Sentry.captureException` on the error branch.

**Strengths:**

- The service-role client (`src/lib/supabase/service.ts`) is imported exclusively from `src/lib/server/**`, `src/hooks.server.ts`, and `+page.server.ts`/`+server.ts` files (62 usages checked) — the "server-only" boundary from `docs/agent-context/auth.md` holds with no leaks into client-facing `.svelte` code.
- `requireAdmin` (`src/lib/server/auth.ts:16-35`) and the auth-context cache (`src/lib/server/auth-context-cache.ts:1-137`, ADR-0014) show a mature, well-commented security-vs-latency tradeoff: `isAdmin` is cached for UI hints but re-verified uncached on every privileged write, explicitly documented as the "no RLS backstop" gate.
- TS/SQL rule mirroring is done right where it matters most: `src/lib/domain/scoring.ts:1-9` (`WEIGHTS` points) textually matches `supabase/src/functions/_private/weight_points.sql:6-7`, and `isDropWorstWeekActive` (`src/lib/domain/scoring.ts:32-35`) documents and correctly references the exact SQL views it mirrors (verified present in `supabase/src/views/leaderboard_season_totals.sql` et al.) — this "keep in sync, cite the SQL file" comment convention is worth propagating to any future dual-implemented rule.

### DB SQL source — Maturity: 4

**Justification:** The pattern is well-documented and ADR-0002's group_id-led-index and tenancy-scoping rules are followed almost everywhere with strong self-documenting rationale, but a leftover legacy RLS bundle duplicates (and has drifted from) the newer per-concern policy files, and two indexes are declared twice.
**Conformance findings** (drift from documented standards):

- [P1] `supabase/src/schemas/0300_rls.sql:1-93` fully duplicates RLS enable + policy definitions that were re-organized into `supabase/src/policies/10_rls_enable.sql`, `20_policies_read_core.sql`, `30_policies_users.sql`, `40_policies_picks.sql`, `50_policies_admin.sql`. Because the generator emits `schemas/` before `policies/` (`supabase/scripts/generate-migration.ts:34-40`), the `policies/*` versions always win at apply time, making `0300_rls.sql` dead-but-still-emitted source — and it has already drifted: it lacks the `del_picks_own_pre` DELETE policy present in `policies/40_policies_picks.sql:41-48`. Two sources of truth for the entire RLS surface (the tenancy security boundary per ADR-0002) is a real risk if someone edits the "wrong" one expecting it to be authoritative. Recommended fix: delete the superseded policy statements from `0300_rls.sql` (or reduce it to a comment pointing at `policies/`), backed by an explicit `drop policy`/no-op migration.
- [P2] Duplicate index declarations: `idx_pick_settlement_game` is created identically in both `supabase/src/schemas/0202_pick_settlement.sql:37` and `supabase/src/indexes/idx_pick_settlement_game.sql:1`; `idx_picks_group_game_user` is created identically in both `supabase/src/indexes/idx_picks_group_game_user.sql:5-6` and inline in `supabase/src/schemas/0210_pick_group_foreign_keys.sql:88-89`. Both are idempotent so currently harmless, but they violate "one primary object per file" in spirit and create ambiguity in the hash ledger about which file owns the object. Recommended fix: keep the index definition only in `indexes/`, drop the inline copies.
- [P2] Inconsistent placement convention for the same kind of object: `picks`' group-led index lives in its own file under `indexes/` (`idx_picks_group_game_user.sql`), while `pick_settlement`'s sibling group-led index (`idx_pick_settlement_group_game_user`) is declared inline in `schemas/0202_pick_settlement.sql:38-39` — same tenancy pattern, two different organizational homes with no documented rule for when to use which. Recommended fix: pick one convention (prefer `indexes/` per the category split) and note the exception for matview indexes (which must stay inline because `indexes/` runs before `views/` in generator order — see `leaderboard_season_totals.sql:155-166`).

**Pattern-quality findings** (maintainability / scalability of the pattern itself):

- [P2] `recap_seen` (`supabase/src/schemas/0226_recap_seen.sql:11`) and `notification_log` (`supabase/src/schemas/0206_notification_log.sql:26-30`) key/index user_id-first rather than group_id-first, unlike every other group-owned table. This is defensible (queries are always per-current-user point lookups) but the ADR's blanket "group-owned queries lead with a group_id-prefixed index" rule isn't annotated with that rationale here the way `idx_group_memberships_group_role_joined.sql` and `idx_picks_group_game_user.sql` do for their choices. Recommended fix: add a one-line comment recording why these two are an intentional exception, so a future reader doesn't "fix" them into an ADR violation.
- [P3] No governing doc addresses index file placement rules (which objects belong in `indexes/` vs inline in the owning schema/view file) beyond the generator's phase ordering being discoverable only by reading `generate-migration.ts`. This is a missing-standard gap, not a violation — worth a short note in `docs/agent-context/database.md` codifying "matview indexes stay inline; base-table indexes belong in indexes/."

**Strengths:** The materialized stats/leaderboard views (`supabase/src/views/leaderboard_season_totals.sql`, `stats_pick_streaks.sql`, `stats_head_to_head.sql`, etc.) and the closed-by-default ACL baseline (`schemas/0000_function_acl_guard.sql`, `schemas/0001_role_baseline.sql`) are exemplary: every group-owned matview carries a comment explicitly citing ADR-0002 for its group_id-leading unique/keyset index, documents CASCADE-drop/re-emit coupling between dependent objects, and explains _why_ (not just what). This density of "why" commentary — plus consistent `is_member(group_id)` RLS scoping across `policies/40_policies_picks.sql`, `41_policies_comments_reactions.sql`, `48_policies_ai_recaps.sql`, `49_policies_season_wrapped.sql`, `51_policies_recap_seen.sql` — is the pattern worth propagating to other layers of the audit.

### Migrations & ledger — Maturity: 4

**Justification:** The ledger, generator, and migration history are fully self-consistent and drift-free today (`db:migration:check` and format checks pass clean, every migration file has exactly one commit touching it, ADR-0012's squash/cleanup promises are fully realized), but the ledger's tamper/integrity guarantee silently degrades for fully-superseded ("orphaned") migrations, and one rubric doc points at a nonexistent workflow.

**Conformance findings** (drift from documented standards):

- [P2] `README.md:136` tells reviewers DB deploys are governed by `.github/workflows/migrate-db.yml`, but that file does not exist — prod migration deploy actually lives in `.github/workflows/deploy-prod.yml:78-94` (`migrate` job running `supabase db push`). — `README.md:136` — Update the README pointer to `deploy-prod.yml` (and keep `migrate-dry-run.yml` for the PR-time dry run) so the doc used as this audit's own rubric doesn't mislead reviewers.
- [P3] ADR-0012 documents a one-time squash but sets no policy for when to re-squash again; 21 migrations / ~180KB have already accumulated in the 6 days since the 2026-06-26 baseline (`supabase/migrations/20260626184826_baseline.sql` at 131KB vs. 21 newer files totaling ~180KB per `ls -la supabase/migrations`). — `docs/adr/0012-migration-history-rebaseline.md:149-169` — Note this as a missing standard: record a re-squash trigger (file count, byte size, or cadence) in the ADR follow-ups or `database.md` rather than relying on another ad hoc offseason window.

**Pattern-quality findings** (maintainability / scalability of the pattern itself):

- [P1] The hash-ledger's tamper/integrity check (`validateMigrationReferences` in `supabase/scripts/generate-migration.ts:195-225`) only re-hashes migration files that a _current_ ledger entry still points to. Once every source file a migration touched is edited again later, that migration becomes fully unreferenced and drops out of validation entirely — confirmed today for `supabase/migrations/20260627023356_materialize_leaderboard_stats_views.sql` and 4 other files (`20260628030106_league_completed_standings.sql`, `20260628033559_lifetime_head_to_head.sql`, `20260628214734_completed_season_by_final_scores.sql`, `20260629004040_fix_completed_seasons_or_check.sql`), none of which are referenced by any of the 140 ledger entries. Compounding this, the from-empty drift guard (`supabase/scripts/verify-src-reproduces-migrations.ts:98-119`) intentionally strips `GRANT`/`REVOKE` lines from its schema comparison ("ACLs MUST be ignored"), so a hand-edit to a grant statement inside one of these orphaned files would be caught by neither the ledger hash check nor the drift-verify CI gate. — `supabase/scripts/generate-migration.ts:195-225`, `supabase/scripts/verify-src-reproduces-migrations.ts:98-119` — Add a lightweight "every committed migration file's sha256 is recorded somewhere durable" check (e.g., a full-directory manifest independent of live ledger references) so superseded migrations stay tamper-evident even after their source keys are overwritten.
- [P3] The generator's signature-change handling (`extractSignature`/drop-and-recreate at `supabase/scripts/generate-migration.ts:75-100,311-318`) infers a function's argument-type signature by regex when only exactly one `create or replace function` appears in the file; a file with zero or multiple matches (or a signature-breaking edit missed by the regex, e.g. exotic type names or `RETURNS TABLE` overloads) silently skips the drop, which can leave an orphaned old-signature function in Postgres after a rename/retype. Only one signature-drop has ever fired in this history (`supabase/migrations/20260630205753_drop_worst_week_non_retroactive_standings.sql:6`), so the failure mode is real but untested at scale. — `supabase/scripts/generate-migration.ts:75-100` — Prefer requiring the explicit `-- @signature:` header for any function whose parameter list changes, or add a pgTAP/CI check that fails if `pg_proc` contains a function name with more overloads than `src/functions/**` currently defines.

**Strengths:** The from-empty vs. migration-chain drift guard (`supabase/scripts/verify-src-reproduces-migrations.ts`, wired as a required gate in `.github/workflows/ci-migration-verify.yml`) is a genuinely strong pattern — it validates actual schema equivalence rather than trusting the ledger's bookkeeping, and it's exactly the mechanism ADR-0012 promised to promote to blocking once the squash landed. The atomic-commit discipline (source + generated migration + ledger entry always land in one commit, ledger JSON always byte-identical to the generator's own serialization) is real and worth propagating as the model for any other generated-artifact layer in this repo.

### Auth / RLS / grants — Maturity: 4

**Justification:** Admin boundary and closed-by-default grant baseline are exemplary and pgTAP-guarded, but the RLS policy/enable layer is duplicated across `schemas/0300_rls.sql` and `policies/*` (already diverging), which is strong-with-drift rather than exemplary per ADR-0011's "one place per object" thesis.

**Conformance findings** (drift from documented standards):

- [P1] Core RLS enable + policies are defined twice and both are live: `schemas/0300_rls.sql` re-declares the same `enable row level security` and the same policies (`sel_picks_owner_or_started`, `ins/upd_picks_pre`, `sel_games/lines/results/totals`, `sel_users`, `admin_sel_settings/audit`) that `policies/*` own; `0300_rls.sql` is emitted (present in `supabase/.migration-hash.json:246`) and the policies phase runs later and wins, so edits to `0300_rls.sql` silently no-op. The copies have already diverged (`0300_rls.sql` lacks `del_picks_own_pre` and the group/comments/reactions/ai policies) — `supabase/src/schemas/0300_rls.sql:1` vs `supabase/src/policies/40_policies_picks.sql:4` / `20_policies_read_core.sql:3` / `50_policies_admin.sql:3`. Fix: collapse `0300_rls.sql` to a header/no-op (the ADR-0011 `zz_`-reduction move) so `policies/` is the sole owner.
- [P3] `docs/agent-context/auth.md:29` says import the service-role client "only in `src/lib/server/**`," but it is imported directly in route modules (`src/routes/(app)/group/+page.server.ts`, `settings/+page.server.ts`, `picks/+page.server.ts`, and the `api/**/+server.ts` handlers). These are server-only by SvelteKit convention so the security invariant holds, but the doc rule has drifted — reword the pack to "server-only modules (`*.server.ts` / `+server.ts` / `$lib/server`)".
- [P3] ADR-0011 §1 specifies enum lockdown (`revoke usage on types from public` + per-enum reconcile), but the implemented baseline deliberately omits it — `supabase/src/schemas/0001_role_baseline.sql:25-29` documents "ENUM/type USAGE is deliberately left alone." Reasoned and commented, but it is an ADR-vs-implementation divergence; record it back in the ADR (Follow-up) so the two agree.

**Pattern-quality findings** (maintainability / scalability of the pattern itself):

- [P2] `enable row level security` is scattered across three locations with no set-based completeness guard: `policies/10_rls_enable.sql`, `schemas/0300_rls.sql`, and per-table schema files (`0200_11_cron_run_log.sql:13`, `0202`, `0205`, `0206`, `0218`, `0226`, plus `27_policies_group_invites.sql:3`). Test `019_authz_matrix.sql:59` hand-lists tables for anon denial and `021` covers only functions — nothing asserts every `public` table has `relrowsecurity = true`, so a new granted table missing its enable line (which under closed-by-default grants means full-table reads for `authenticated`) is not systematically caught. Add one set-based pgTAP assertion over `pg_class.relrowsecurity`.
- [P2] Enum ACLs are touched in three files (`0001_role_baseline.sql` leaves them, `anon_grants.sql:14-15` revokes from anon, `player_grants.sql:18-19` grants to authenticated) — a mild split source of truth for the same object class; consolidate enum grants to one file as the schema grows.

**Strengths:**

- Three-way admin consistency worth propagating: `public.is_admin()` (`0052_is_admin.sql:8`), `hooks.server.ts:139` `injectSession`, and `requireAdmin` (`src/lib/server/auth.ts:23`) all key off `public.users.role === 'admin'`, and `requireAdmin` re-reads fresh/uncached precisely because the service-role handlers have no RLS backstop — all 7 `/api/admin/*` endpoints gate through it.
- Closed-by-default function baseline is exemplary defense-in-depth: the `_close_new_fn_acl` event trigger (`0000_function_acl_guard.sql`) + one-time reconcile (`0001_role_baseline.sql:52`) is backstopped by pgTAP `021` which fails CI on any PUBLIC-executable function and `001` which asserts anon is denied EXECUTE at the privilege layer.
- Service-role client is Proxy-lazy with a runtime-only secret and confined to server-only modules (`src/lib/supabase/service.ts`); no client-facing import exists.

### Workflows / CI / deploy — Maturity: 4

**Justification:** ADR-0010's manually-gated release pipeline and the CI test-layer gates match `docs/WORKFLOW.md`/`testing.md` precisely (the prior audit's stale-doc and Node-skew findings are now fixed), but the ADR-0010 amendment that deleted `migrate-db.yml` was never propagated to `clone-to-staging.yml`, leaving a dead guard and a real staging schema/data-integrity gap.

**Conformance findings** (drift from documented standards):

- [P1] `clone-to-staging.yml` still waits on / checks the result of `migrate-db.yml`, a workflow deleted in commit `6c80377` ("fold prod migrations into the manual release") when its jobs were folded into `deploy-prod.yml` — `.github/workflows/clone-to-staging.yml:58,70,87` — the `gh run list --workflow=migrate-db.yml` calls always find zero runs now, so the "wait for production migration"/"abort if migration failed" guards are silent no-ops; update them to key off `deploy-prod.yml`'s `migrate` job (or drop the wait entirely and document the new correlation, since migrations no longer run on push at all).
- [P3] `ci-tests.yml`'s header comment still names the file `ci.yml` — `.github/workflows/ci-tests.yml:1` — update the comment to match the actual filename testing.md references.

**Pattern-quality findings** (maintainability / scalability of the pattern itself):

- [P1] Because prod migrations now apply only on manual `deploy-prod` dispatch (ADR-0010 amendment) while `clone-to-staging.yml` still triggers on every `push: branches: [master]` and unconditionally runs `supabase db push` against staging from repo state — `.github/workflows/clone-to-staging.yml:4-6,96-99` — staging's schema can now run ahead of production's for arbitrarily long between releases, then have production's `pg_dump` data restored into it (`clone-to-staging.yml:168-180`); a migration whose expectations aren't met by not-yet-migrated prod data can corrupt or break the staging clone. Gate this workflow on the same release signal as `deploy-prod.yml` (e.g. run after `deploy-prod` completes) rather than on every merge.
- [P2] `SUPABASE_CLI_VERSION` is hand-duplicated as an identical literal (`2.107.0`) in 8 separate workflow files — `.github/workflows/{deploy-prod,ci-pgtap,ci-integration,ci-migration-verify,migrate-dry-run,playwright(x2),clone-to-staging}.yml` — extract to a repo variable (`vars.SUPABASE_CLI_VERSION`) or a composite action so a CLI bump is a one-line change instead of an 8-file grep-and-replace.
- [P2] The Postgres-17-client + pgdg-apt-repo install steps in `deploy-prod.yml`'s `backup` job and `clone-to-staging.yml` are near-identical ~10-line blocks — `.github/workflows/deploy-prod.yml:54-64`, `.github/workflows/clone-to-staging.yml:28-37` — extract to a local composite action (`.github/actions/setup-pg-client`) to avoid the two copies drifting.
- [P3] `clone-to-staging.yml` is the only workflow whose `permissions:` block omits `contents: read` (only declares `actions: read`) while every other workflow in scope explicitly grants it for `actions/checkout` — `.github/workflows/clone-to-staging.yml:16-17` — currently harmless because the repo is public, but add `contents: read` explicitly for consistency and to avoid breakage if the repo ever goes private.
- [P3] `migrate-dry-run.yml`'s PR-triggered job authenticates to the production database using the `environment: Production` secrets gate — `.github/workflows/migrate-dry-run.yml:52-53` — confirm in GitHub repo settings that the `Production` environment has required-reviewer protection; otherwise any PR (including from a fork, modulo `dependabot` exclusion) gets automatic read access to the prod DB connection string.

**Strengths:** The thin `_cron-call.yml` reusable-workflow pattern (six ~15-line callers, zero duplicated HTTP/status/Sentry-check-in logic) is exemplary DRY reuse worth propagating to other repeated-job families; `deploy-prod.yml` implements ADR-0010's amended manual release ritual (`source_integrity → backup → migrate → deploy → tag`) line-for-line faithfully with correct job ordering and `cancel-in-progress: false`; and Vercel CLI/Supabase CLI pinning plus Dependabot-managed action versions (`.github/dependabot.yml`) give the release path a stable, reviewable upgrade path rather than silent `@latest` drift.

### Tests (4 tiers) — Maturity: 4

**Justification:** Layering, isolation, and E2E-pillar discipline are strong and well-documented, but coverage thresholds are dead config and the tiering doc/AGENTS.md now misstate what actually gates PRs.

**Conformance findings** (drift from documented standards):

- [P1] `docs/agent-context/testing.md:13` and `AGENTS.md:150-156` both state unit tests are "the only test layer CI runs on PRs to master" and that integration/pgTAP/e2e "run only against a local stack," but `.github/workflows/ci-integration.yml:3-9` and `.github/workflows/ci-pgtap.yml:2-4,49-61` both trigger on `pull_request: branches: [master]`, boot a local Supabase stack in-runner, and (pgTAP) have an explicit always-run gate job so the check reports even when path-filtered — i.e. these now gate merges. This drifted after the "require-ci" work landed (`git log`: `2a65151 ci: add gate jobs so required checks always report when paths skip`, `a761613`, both 2026-07-02) without a doc update. — Update both docs to describe the actual gating set (lint, unit, build always; integration/pgTAP conditionally-required via path filters; e2e smoke required, full informational).
- [P2] Coverage `thresholds` are declared in both `vitest.config.ts:59-64` (70/70/60/70) and `vitest.integration.config.ts:38-43` (50/50/40/50), but no CI workflow ever passes `--coverage` (`ci-tests.yml:70` runs plain `pnpm run test:unit`; `ci-integration.yml:67` runs plain `pnpm test:integration`), and there is no codecov/coverage-reporting step anywhere in `.github/workflows/*.yml`. The thresholds are unenforced dead config — a coverage regression cannot fail CI. — Either wire `pnpm test:coverage` (package.json:42) into a CI job with threshold enforcement, or remove the thresholds so the config isn't misleading.
- [P3] The `@smoke` set is 8 tests (`leaderboard.spec.ts:7`, `wrapped.spec.ts:7`, `picks.spec.ts:46`, `self-signup.spec.ts:262`, `stats.spec.ts:3`, `client-cache.spec.ts:45`, `auth.spec.ts:27`, `nav.spec.ts:17`) against the documented "keep it small (~5–6 tests)" target in `docs/agent-context/testing.md:112`. Not yet a problem but trending past the stated budget. — Revisit whether all 8 are core flows before adding more.

**Pattern-quality findings** (maintainability / scalability of the pattern itself):

- [P2] `tests/integration/` isolation relies on hand-written per-suite `beforeAll`/`afterAll` cleanup with ad-hoc delete-by-tag conventions (e.g. `tests/integration/grading.test.ts:31-33`, `tests/integration/comments...` pattern repeated per file) rather than a shared reset helper analogous to `tests/e2e/helpers/seed.ts`. Each of the 18 integration spec files re-implements its own teardown/upsert boilerplate against `tests/integration/fixtures/db.ts` (647 lines) — workable now but duplication grows linearly with each new suite. — Consider a shared `resetForSuite(tag)`-style helper mirroring the e2e seed helper to cut per-file boilerplate.
- [P3] `src/lib/server/__tests__/odds.spec.ts:1-38` still uses the documented-fragile pattern (module-level `vi.mock('$env/dynamic/private', …)` with only the keys the spec needs, `vi.stubGlobal('fetch', …)` with no default headers) called out as a known trap in `docs/agent-context/testing.md:16-19`. The production code (`src/lib/server/odds.ts:19-23`, `recordUsage()`) already had to add defensive `res.headers?.get(...)` handling to survive it — the trap is documented but not removed, so the next server change touching odds/headers is still at risk of the same break. — Low priority since it's flagged, but a shared fetch-mock-with-headers fixture would remove the trap class entirely rather than relying on defensive prod code.

**Strengths:** The E2E page-object + `data-testid` discipline (`tests/e2e/helpers/picks-board.ts`, `helpers/auth-page.ts`) is consistently applied with explicit "why testid vs text" comments at each locator; `tests/e2e/helpers/seed.ts` centralizes idempotent fixture reset exactly per Pillar 2; and the grading logic is properly layered without redundant duplication — unit (`src/lib/server/__tests__/grading.spec.ts`, mocked orchestration), integration (`tests/integration/grading.test.ts`, real DB write path), and pgTAP (`supabase/tests/003_grade_pick.sql`, `022_house_grading.sql`, RLS/SQL-function invariants) each own a distinct concern.

### Types & config / tooling — Maturity: 4

**Justification:** Configs faithfully implement the documented policies (eslint any-scoping, prettier gate, generated-types boundary, CI lint/check/build) with only small drift and a few unpinned/duplicated details that create friction at scale.
**Conformance findings** (drift from documented standards):

- [P2] AGENTS.md tells Codex to run `corepack prepare pnpm@<repo-version> --activate`, but `package.json` has no `packageManager` field, so there is no single source of truth for "repo-version" pnpm — agents must infer it from `pnpm/action-setup@v6 with version: 9` in CI workflows instead — `package.json:1-4` (no `packageManager` key) vs `.github/workflows/ci-tests.yml:34-36` — add `"packageManager": "pnpm@<x.y.z>"` to `package.json` so Corepack has an authoritative version.
- [P3] `.npmrc:1` sets `engine-strict=true` but `package.json` declares no `engines` field, so the strict flag enforces nothing — `.npmrc:1`, `package.json` (no `engines` block) — add an `engines.node`/`engines.pnpm` range or drop `engine-strict`.
- [P3] `.gitignore` still ignores `src/lib/server/db/types.ts`, a file that no longer exists in the tree (last touched in an old merge commit) — `.gitignore:9` — remove the stale entry as generated-file-hygiene cleanup.

**Pattern-quality findings** (maintainability / scalability of the pattern itself):

- [P3] `refresh-wrapped:prod` breaks the otherwise-consistent `db:<verb>:<env>` script naming convention used by every other data/env script (`db:backfill:*`, `db:clone:*`, `db:backup:prod`, `db:refresh-matviews:prod`) — `package.json:16` — rename to `db:refresh-wrapped:prod` for scriptability/discoverability.
- [P3] `src/lib/types/server.ts` (a file) and `src/lib/types/server/` (a directory) coexist with overlapping names; no ambiguity today because nothing imports `server/index.ts`, but the naming is confusing for new contributors and IDE auto-import — `src/lib/types/server.ts:1`, `src/lib/types/server/*.ts` — rename the directory (e.g. `serverTypes/`) or fold `server.ts`'s contents into the directory.
- [P3] `tsconfig.json:12` redundantly re-declares `"moduleResolution": "bundler"`, which `.svelte-kit/tsconfig.json` (the `extends` base) already sets to the same value — harmless but adds config duplication that can silently drift if SvelteKit changes its generated default — drop the redundant key.
- No documented standard governs tsconfig strictness beyond `"strict": true` (no ADR/AGENTS.md rule on `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, etc.) — flagging as a **missing standard** rather than a violation; `tsconfig.json:11`. Worth a lightweight team decision as the codebase grows, not urgent today.

**Strengths:** Hand-written domain types consistently derive from the generated `Database`/`Enums` types rather than re-declaring DB shapes (`src/lib/types/domain.ts:1`, `src/lib/types/server.ts:1,3`), keeping the generated-file boundary real in practice, not just in docs. The `@typescript-eslint/no-explicit-any` scoping in `eslint.config.js:46-50` exactly matches the AGENTS.md policy (error under `src/lib`/`src/routes`, off for `tests/**` and `supabase/scripts/**`), and CI (`ci-tests.yml`) runs exactly the lint/check/unit/build gate the docs promise. The Prettier enforcement chain (`.prettierrc` → `pnpm format` → `.githooks/pre-commit` sweeping whole-repo drift into every commit) is a genuinely strong, low-friction pattern worth propagating to other tooling gates.

### Delivery / process governance — Maturity: 3

**Justification:** The governance model is well-designed (single-source ADR status, link-not-copy packs, label-driven versioning) and every referenced artifact exists, but the two manual freshness steps this lane exists to check — flipping shipped ADRs to Accepted and logging every PR — have both lapsed across the most recent milestone.

**Conformance findings** (drift from documented standards):

- [P1] Four ADRs whose implementation shipped are still `Status: Proposed`: ADR-0013 (`#191` shipped 2026-06-26, now the foundation of the entire stats/badges/AI-recap subsystem) — `docs/adr/0013-materialized-leaderboard-stats.md:3`; ADR-0015 (`#265` shipped, drives every v2.4–v2.8 release) — `docs/adr/0015-versioning-and-release-policy.md:3`; ADR-0016 (`#274` shipped in v2.4) — `docs/adr/0016-non-scoring-rounds.md:3`; ADR-0018 (`#357`+`#358` shipped) — `docs/adr/0018-non-retroactive-drop-worst-week.md:3`. The lifecycle (`docs/adr/README.md:31`) says flip to Accepted on approval, and the CHANGELOG shows this was done before (ADR-0010/0011/0012/0014 "→ Accepted"), so it is drift, not policy. Fix: flip all four to Accepted (or explicitly Rejected).
- [P1] The process docs cite two still-`Proposed` ADRs as settled law: `AGENTS.md:131` and `docs/WORKFLOW.md:181` state "Version impact is label-driven (ADR-0015)" as binding, and ADR-0013 is cited as the governing pattern across dozens of merged PRs — while both remain Proposed. Fix: accept the ADRs so the authoritative docs aren't referencing unratified decisions.
- [P1] ADR-0018 supersedes ADR-0005 and ADR-0005 is already marked `Superseded by ADR-0018` (`docs/adr/0005-drop-worst-week-scoring.md:3`), but the superseding record is only Proposed — a terminal "superseded" state pointing at a non-Accepted ADR. Fix: accept ADR-0018 (its work fully shipped) to make the chain consistent.
- [P1] The CHANGELOG's "rides in the PR, cannot drift" guarantee (`docs/CHANGELOG.md:14-15,42`) is empirically violated: several merged v2.8 PRs have no standalone entry and appear only inside the release-summary line — `#302` (recap push, merged PR #365), `#352`, `#355`, `#356`, `#364`, and `#330`/PR #341 (client data cache, whose ADR-0017 is already Accepted) — see `docs/CHANGELOG.md:55`. Fix: backfill the missing per-PR entries.
- [P2] A placeholder entry `**PR #NNN** Season Wrapped force-refresh` was merged unfilled — it should be PR #354 per the release summary — `docs/CHANGELOG.md:62`. This directly breaks the "keyed by PR number" rule (`docs/CHANGELOG.md:40`). Fix: replace `PR #NNN` with `PR #354`.

**Pattern-quality findings** (maintainability / scalability of the pattern itself):

- [P1] Status accuracy and the per-PR changelog entry are both manual `finish-pr` steps with no CI gate, so they lapse silently the moment a PR skips the skill (release/dependabot/hotfix PRs, or the recent v2.8 patch cluster). Because `reconcile-blocked`/`release-status` read `- Status:` lines and the changelog as inputs, a stale `Proposed` on a shipped ADR can cause a dependent issue to be judged wrongly blocked — `docs/adr/README.md:41-44`. Change: add a CI check that fails when an ADR's linked issue is Closed but Status is still Proposed, and that flags merged PRs absent from `docs/CHANGELOG.md`.
- [P2] The release-summary line re-lists every milestone PR by number (`docs/CHANGELOG.md:55`), duplicating what standalone entries should carry — and the two already disagree (summary lists PRs that have no standalone entry). This is exactly the drift-prone duplication the WORKFLOW warns against. Change: make the release entry link to the GitHub Release / milestone rather than re-enumerating PR numbers, or enforce that every number in the summary has a matching standalone entry.
- [P3] The manual "fill in the release entry after merge" workaround is itself evidence the "cannot drift" model is aspirational — the v2.8 release entry required a follow-up `docs(changelog): fill in PR #369` commit. Change: generate the release-summary line from the milestone at `cut-release` time instead of hand-editing.

**Strengths:** Single-source ADR status (the index deliberately dropped its Status column so header and index can't disagree — `docs/adr/README.md:41-44`) is an excellent anti-drift pattern worth propagating. The link-not-copy rule for agent-context packs (`docs/agent-context/README.md:19-30`) is cleanly followed and keeps the doc web maintainable. Every documented process artifact actually exists and matches its claim — issue templates, `.githooks/pre-commit`, and the `pnpm prepare` → `core.hooksPath` wiring (`package.json:35`) are all real and accurately described.

# Repository pattern audit — 2026-06-26

Layered, parallel grading of the repo's established patterns against its **own**
documented standards (`AGENTS.md`, the ADRs under `docs/adr/`, and the
`docs/agent-context/` packs). Each of nine lanes scored two axes — **conformance**
(does the code follow the documented rule?) and **pattern quality** (is the pattern
worth keeping / will it scale?) — on a 1–5 maturity scale.

Read-only audit. Nothing was committed, pushed, or filed. HEAD was graded as-is; a
single uncommitted reconciliation (`supabase/src/functions/odds/set_active_line.sql`

- its generated migration, ledger hash, and CHANGELOG entry) was present in the
  working tree and **not** part of this audit.

**Maturity scale:** 5 exemplary · 4 strong (minor drift) · 3 adequate (friction at
scale) · 2 at-risk (drifting; refactor advisable) · 1 weak (violates a standard).
**Priority:** P0 correctness/security/integrity or hard scaling blocker · P1 fix soon ·
P2 schedule it · P3 polish.

---

## Scorecard

| Lane                          | Maturity | One-line justification                                                                                                           |
| ----------------------------- | :------: | -------------------------------------------------------------------------------------------------------------------------------- |
| UI / frontend                 |  **4**   | Full Svelte 5 runes adoption, Tailwind 4 `@theme` correct, vendored shadcn untouched; a few prop/store drift spots.              |
| Server / backend              |  **4**   | reads/writes split, domain-rule mirroring, and auth guards consistent; service modules sometimes bypass the `db/` layer.         |
| DB SQL source                 |  **3**   | Tenancy + `group_id` indexing solid; duplicate prefixes, duplicate index/policy definitions, implicit `group_id` in `lock_pick`. |
| Migrations & ledger           |  **3**   | Integrity machinery robust and CI-gated; naming discipline broken (24 default-named), two hand-edits, squash unexecuted.         |
| Auth / RLS / grants           |  **4**   | Live trust boundary coherent and pgTAP-backstopped; two split-source hazards (`0300_rls.sql`, `zz_*` grant + false comment).     |
| Workflows / CI / deploy       |  **4**   | Version-gated deploy + thin cron-caller pattern exemplary; docs say "lint not in CI" but CI runs lint; minor Node/CLI skew.      |
| Tests (4 tiers)               |  **4**   | Tiers used correctly, E2E 5-pillar framework real; coverage thresholds never enforced, thin smoke set, one skipped flow.         |
| Types & config / tooling      |  **3**   | Scripts↔docs aligned, strict TS on; documented `no-explicit-any: error` is actually `warn`, two prod `any`s slipped in.          |
| Delivery / process governance |  **4**   | Governance design is exemplary and self-consistent; concurrent drift — stale ADR statuses, behind changelog, ADRs sans issues.   |

**No P0 findings in any lane.** The live trust boundary, data integrity, and release
gating are sound. Every finding below is maintainability/scalability, not a correctness
or security hole.

---

## Executive summary — what to patch

Five themes span the lanes. The top two are where the leverage is.

### 1. ADR-0011/0012 are mid-rollout, and the leftover scaffolding is now actively misleading

The biggest cluster of findings is one story told from three lanes. The closed-by-default
grant baseline (ADR-0011) **landed and works**, but the migration-history squash that was
supposed to clean up after it (ADR-0012 PR2) **has not run**. So the repo carries both the
new pattern and the obsolete workarounds it was meant to delete:

- the `zz_*` grant-ordering files persist, and `zz_picks_fanout_grants.sql:4` still
  justifies itself with a "blanket revoke" rationale that **is no longer true** (Auth lane, P1);
- `schemas/0300_rls.sql` is a stale, already-diverged duplicate of the `policies/*.sql`
  files and a from-empty-squash phase-ordering landmine (Auth + DB-source lanes, P1);
- the `LEGACY_MULTI_OBJECT_SOURCES` freeze and duplicate schema prefixes remain (Migrations lane).

**The single highest-leverage action is to schedule and execute the ADR-0012 squash (PR2),
which resolves all of the above at once** — then promote ADR-0011/0012 to Accepted.

### 2. Several stated standards are documented but not wired to actually enforce

The repo writes good policies and then doesn't bolt them to the toolchain:

- `@typescript-eslint/no-explicit-any` is documented as `error` for `src/lib` + `src/routes`
  but is configured as `warn` — and two production `any`s slipped through as a direct result
  (Types/config, P1);
- Vitest coverage thresholds are declared in both configs but CI never passes `--coverage`,
  so they never gate (Tests, P2);
- the ADR-0011 authz matrix runs only on the `db:reset` path, not the prod-equivalent
  incremental-apply path (Auth, P2).
  Each is a "looks enforced, isn't" gap — cheap to close, high signal value.

### 3. The docs lag the code — the governance design is good, the upkeep slipped

ADR-0010 and ADR-0011 shipped but are still listed `Proposed`; the CHANGELOG is ~6 merged
PRs behind on a single day (including #214 / ADR-0009 global-picks fan-out); and
`testing.md`/`CLAUDE.md` still say "lint never runs in CI" while `ci-tests.yml` runs a full
lint+check job (the actual behavior is _better_ than documented). Root cause: ADR Status is
duplicated by hand between each ADR header and the index table — exactly the
"don't duplicate live status" rule WORKFLOW.md sets for itself (Governance, P1).

### 4. Duplicate / split sources of truth recur across the SQL layer

Beyond `0300_rls.sql`: duplicate numeric schema prefixes (six pairs), index definitions
declared both inline in schema files and in dedicated `indexes/*.sql`, and `lock_pick` /
`lock_pick_all_groups` carrying verbatim-duplicated All-In enforcement logic. Ordering
becomes filesystem-sort-dependent and rule changes must be applied twice. The squash is the
natural fix; until then, new files must claim unused prefixes.

### 5. Test depth is lopsided — DB is exemplary, UI/E2E breadth is the gap

pgTAP coverage (21 files, RLS matrices, grant baselines, born-closed proofs) is the strongest
asset in the repo and scales with schema. By contrast the required E2E **smoke** set covers
only 5 flows — no group-switcher, comments/reactions, invite-join, or create-group — so the
required CI gate under-protects the multi-group features that are the active roadmap.

---

## Prioritized recommendations (merged across lanes)

### P0

None. No correctness, security, or data-integrity blockers were found.

### P1 — fix soon

1. **Execute the ADR-0012 squash (PR2)**, which clears the `zz_*` hack, the LEGACY freeze,
   the duplicate prefixes, and the `0300_rls.sql` landmine in one move — then **promote
   ADR-0010 & ADR-0011 to `Accepted`** in both the headers and the index. _(Governance / Auth / Migrations)_ — `docs/adr/README.md:50-51`, `docs/adr/0010-production-release-gating.md:3`, `docs/adr/0011-grant-and-rls-baseline-pattern.md:3`
2. **Reduce `schemas/0300_rls.sql` to a no-op header.** It re-declares policies the
   `policies/*.sql` files own, has already diverged (missing `del_picks_own_pre`,
   `ins_audit_by_actor`), and creates function-dependent policies in the schema phase —
   breaking a from-empty squash. _(Auth / DB SQL source)_ — `supabase/src/schemas/0300_rls.sql:1`
3. **Fold `zz_picks_fanout_grants.sql` into its object grant files and delete the false
   comment.** Its `zz_` rationale (a "blanket revoke" in `player_grants.sql`) no longer
   exists; the comment is an active maintenance trap. _(Auth)_ — `supabase/src/grants/zz_picks_fanout_grants.sql:4`
4. **Wire `@typescript-eslint/no-explicit-any: error` for `src/lib` + `src/routes`** (it
   currently inherits `warn`), then fix the two `any`s it would have caught
   (`src/lib/pwa/client.ts:11`, `src/lib/utils.ts:9,11`). _(Types/config)_ — `eslint.config.js:12-51`
5. **Backfill the CHANGELOG** with the ~6 merged PRs from 2026-06-26 (esp. #214 / ADR-0009
   global-picks fan-out) and treat the entry as a hard `finish-pr` gate — downstream skills
   read this file to decide what shipped. _(Governance)_ — `docs/CHANGELOG.md:36-38`
6. **Break the ADR-Status duplication** (header ↔ index synced by hand) so 0010/0011-style
   staleness stops recurring — generate the index Status column, or drop it and link out.
   _(Governance)_ — `docs/WORKFLOW.md:20`
7. **Give `lock_pick` an explicit `p_group_id` parameter** and validate active membership,
   instead of resolving the caller's first membership by `joined_at` — ADR-0002 requires
   group-owned writes to carry an explicit scope. _(DB SQL source)_ — `supabase/src/functions/picks/lock_pick.sql:40-47`
8. **Confirm the two hand-edited migrations are not re-authored by the squash** and document
   them as forward-only historical artefacts until then. _(Migrations)_ — `supabase/migrations/20250908010957_fix_function_grants.sql`, `supabase/migrations/20250916155742_resolve_diff.sql`
9. **Make `OddsSyncCard`'s `settings` prop `$bindable()`** (or replace the in-place mutation
   with an `onSettingsUpdate` callback) — it currently mutates a non-bindable prop, against
   Svelte 5 unidirectional discipline. _(UI)_ — `src/lib/components/admin/OddsSyncCard.svelte:33-35`
10. **Broaden the required E2E smoke set** — tag one representative `@smoke` test each for
    group-switcher, comments/reactions, invite-join, and create-group (target 8–10 total).
    _(Tests)_ — `tests/e2e/group-switcher.spec.ts`, `tests/e2e/comments.spec.ts`, `tests/e2e/join-invite.spec.ts`, `tests/e2e/create-group.spec.ts`

### P2 — schedule it

11. **Run unit tests with `--coverage` in CI** so the declared thresholds actually gate.
    _(Tests)_ — `.github/workflows/ci-tests.yml:70`, `vitest.config.ts:59-64`
12. **Refresh stale CI docs:** `testing.md`/`CLAUDE.md` say lint/check/build don't run in CI,
    but `ci-tests.yml` runs all three (actual behavior is better — fix the docs).
    _(Workflows)_ — `.github/workflows/ci-tests.yml:16-47,72-99`
13. **Enforce migration `--name`** — 24 of 63 migrations are the default `migrations_patch`;
    add a generator guard/warn when the name equals the default. _(Migrations)_ — `supabase/scripts/generate-migration.ts:353`
14. **Resolve the duplicate schema/pgTAP numeric prefixes** (six schema pairs; `012_` pgTAP
    pair) so load order stops being filesystem-sort-dependent. _(DB SQL source / Migrations / Tests)_ — `supabase/src/schemas/0215_comments.sql:1` et al., `supabase/tests/012_*.sql`
15. **Drop duplicated index definitions** declared both inline in schema files and in
    `indexes/*.sql`; let the dedicated files be canonical. _(DB SQL source)_ — `supabase/src/schemas/0210_pick_group_foreign_keys.sql:88-89`, `supabase/src/schemas/0202_pick_settlement.sql:31`
16. **Extract shared `lock_pick` / `lock_pick_all_groups` enforcement** into one `_private`
    helper both delegate to, instead of verbatim-mirrored logic. _(DB SQL source)_ — `supabase/src/functions/picks/lock_pick_all_groups.sql:87-111`
17. **Add a `requireUser(event)` guard** mirroring `requireAdmin`, and route user-facing
    API handlers through it (layout `load` auth does not run for `+server.ts`). _(Server)_ — `src/routes/(app)/+layout.server.ts:1`, `src/routes/(app)/api/`
18. **Keep service modules behind the `db/` layer** — `oddsSync.ts` and `grading.ts` reach
    Supabase directly in spots; move those reads/writes into `db/queries` / `db/commands`.
    _(Server)_ — `src/lib/server/oddsSync.ts:69`, `src/lib/server/grading.ts:101`
19. **Run the ADR-0011 authz matrix on the incremental-apply path**, not just `db:reset`.
    _(Auth)_ — `supabase/tests/021_function_grant_baseline.sql:21`
20. **Pin the Vercel CLI** (`vercel@latest` → a fixed major) in both deploy workflows, and
    **align Node to 22** in `ci-integration.yml`. _(Workflows)_ — `.github/workflows/deploy-prod.yml:70`, `.github/workflows/deploy-preview.yml:59`, `.github/workflows/ci-integration.yml:46`
21. **Switch the integration runner to `environment: 'node'`** (currently `jsdom` for pure
    server HTTP tests). _(Tests)_ — `vitest.integration.config.ts:10`
22. **De-hardcode the backfill XLSX path** (`C:/Users/dough/...`) into a positional arg so
    it runs on another machine / CI. _(Types/config)_ — `package.json:10-12`
23. **Extend the CHANGELOG convention to issue-less PRs** (log by PR number) so skills/infra
    work isn't invisible to "is X done?". _(Governance)_ — `docs/CHANGELOG.md:18-19`
24. **De-duplicate `ACTIVE_TAB_TRIGGER_CLASS`** and retire the unused
    `src/lib/stores/leaderboard.ts` Svelte-4 `writable` stores. _(UI)_ — `src/routes/(app)/leaderboard/+page.svelte:23`, `src/lib/stores/leaderboard.ts:1-6`

### P3 — polish

Tracked in the per-lane blocks below: generated-file banner on `supabase.ts`; record a
"0008 withdrawn" index note; pin `search_path` on `is_admin()`/`game_has_started()`;
`WeightSelect.svelte` `$derived`→`$state`; explicit 401s in `picks/[gameId]`; header
comment on the `0401_unique_game_external.sql` grandfathered bundle; `:global(.team-btn)`
scoping; `svelte.config.js` experimental-flag comment; non-swallowing `prepare` script;
fix the `AGENTS.md:53` dangling user-level pointer.

---

## Per-lane grade blocks

### UI / frontend — Maturity: 4

**Justification:** All .svelte files in routes and components are fully on Svelte 5 runes with zero legacy idioms; Tailwind 4 is correctly configured via `app.css @theme inline` with no stray `tailwind.config.js`; vendored shadcn-svelte is untouched; only a handful of drift points prevent an exemplary score.

**Conformance findings** (drift from documented standards):

- [P1] `OddsSyncCard.svelte` mutates the `settings` object prop directly (`settings.used += 1`, `settings.remaining = ...`) without declaring the prop `$bindable()` — violates Svelte 5's stated unidirectional prop discipline — `src/lib/components/admin/OddsSyncCard.svelte:33-35` — add `$bindable()` to the `settings` prop or replace mutation with a callback prop (`onSettingsUpdate`) so the parent owns the update
- [P2] `WeightSelect.svelte` declares `let value = $derived<WeightCode | undefined>(selectedWeight)` but then reassigns `value` in three event-handler branches — `$derived` is read-only in Svelte 5 runes; the intent (local override that resets when the prop changes) requires `$state` initialised from the prop plus a `$effect` to re-sync — `src/lib/components/picks/WeightSelect.svelte:36,63,68,100` — replace with `let value = $state(selectedWeight)` and a `$effect(() => { value = selectedWeight; })` so semantics match what the comment already describes
- [P2] `src/lib/stores/leaderboard.ts` exports three `writable` stores (Svelte 4 `svelte/store` API) that are never imported by any `.svelte` component or route — the app passes this data through SvelteKit `data` props — contradicts the "Svelte 5 runes is the target idiom" rule in AGENTS.md — `src/lib/stores/leaderboard.ts:1-6` — delete the file (the single consumer is a trivial spec) or migrate to a `.svelte.ts` `$state` module if cross-component sharing is ever needed

**Pattern-quality findings** (maintainability / scalability of the pattern itself):

- [P2] `ACTIVE_TAB_TRIGGER_CLASS` is an identical copy-pasted string constant in two separate route files — `src/routes/(app)/leaderboard/+page.svelte:23` and `src/routes/(app)/stats/+page.svelte:42` — extract to `src/lib/ui/tabs.ts` and import from both pages
- [P2] `TeamSelect.svelte` uses `:global(.team-btn)` and `:global(.team-btn.selected)` to style the shadcn `Button` child across the shadow boundary — the class name is generic and risks collision as the component library grows — `src/lib/components/picks/TeamSelect.svelte:65-77` — move the gradient rules to `src/app.css` under a more specific selector (e.g. `.picks-board .team-btn`) or eliminate the class entirely and drive all styling through the CSS custom properties (`--c1`, `--c2`, `--fg`) that are already set via `style=`

**Strengths:**

1. Complete Svelte 5 runes adoption across every route and component — zero `export let`, zero `$:` reactive declarations, zero `createEventDispatcher`; the migration is thorough and consistent.
2. Context-scoped picks store (`providePicksStore` / `usePicksStore` in `src/lib/stores/picks.ts`) correctly separates mutable board state from SSR page data, with a module-level fallback for non-component callers, debounce/sequence guards, and clear per-function JSDoc — a strong pattern worth replicating for other complex cross-component state.
3. `src/lib/pwa/install.svelte.ts` demonstrates the idiomatic Svelte 5 approach to shared reactive module state — a `$state`-based factory function in a `.svelte.ts` file — which is the correct documented replacement for Svelte 4 `writable` stores.

### Server / backend — Maturity: 4

**Justification:** Core patterns (db reads/writes split, domain rule mirroring, admin/cron auth guards) are well-documented in AGENTS.md and consistently applied across most of the codebase; minor but real drift exists where service-layer modules bypass the db/ abstraction with direct Supabase calls.

**Conformance findings** (drift from documented standards):

- [P2] `oddsSync.ts` contains an inline `supabaseService.from('game_lines').select(...)` read inside the sync loop, bypassing `db/queries/` entirely. AGENTS.md states `db/queries/` (reads) wraps Supabase — `src/lib/server/oddsSync.ts:69` — Extract to a `getActiveLineForGame(gameId, source)` query in `db/queries/`.
- [P2] `grading.ts` writes `games.final_scores` directly via `supabaseService.from('games').update(...)` inline in the service, bypassing `db/commands/`. AGENTS.md states `db/commands/` (writes) wraps Supabase — `src/lib/server/grading.ts:101` — Move to a `db/commands/persistGameScores.ts` command.
- [P3] `settings.ts` mixes reads and writes in one module with no queries/commands split (`canSyncNow` reads, `recordOddsApiUsage` writes), contrary to the pattern established under `db/` — `src/lib/server/settings.ts:32–63` — Low urgency given it is a single-row table, but naming drift can mislead new contributors.
- [P3] `/api/picks/[gameId]` POST and DELETE handlers carry no explicit `!user` guard; an unauthenticated caller receives a SQL RPC error rather than a clean 401. Inconsistent with auth.md's documented session model for endpoint responses — `src/routes/(app)/api/picks/[gameId]/+server.ts:26` — Add `if (!event.locals.user) return json({ ok: false, reason: 'Not authenticated' }, { status: 401 })` before the RPC call.

**Pattern-quality findings** (maintainability / scalability of the pattern itself):

- [P2] No shared `requireUser` guard for user-facing API routes. The `(app)/+layout.server.ts` auth redirect only runs for page loads, not `+server.ts` handlers (SvelteKit does not call layout `load` on API requests). Each endpoint individually implements auth via one of three styles: explicit `!user` guard, `requireAdmin`, or silent RLS reliance — `src/routes/(app)/+layout.server.ts:1` and `src/routes/(app)/api/` — A `requireUser(event)` helper mirroring `requireAdmin` would normalize the pattern and make gaps searchable.
- [P2] Service modules (`grading.ts`, `oddsSync.ts`) inconsistently use the db/ layer: `oddsSync.ts` correctly calls `findActiveWeek`, `findTeamsByNames`, `attachLineToMatchup`, and `setActiveLine` from `db/`, but also queries `game_lines` directly. As the service layer grows this blurs the data-access boundary — `src/lib/server/oddsSync.ts:69` and `src/lib/server/grading.ts:65–110` — Enforce a rule that service modules may only reach Supabase via `db/queries/` or `db/commands/`; direct calls belong in those layers.
- [P3] `revoke-invite/+server.ts` manually reads `group_memberships` via the service-role client to check commissioner status in TS, leaking authorization logic out of SQL. The comment acknowledges this explicitly but the pattern is hard to audit compared to RLS-enforced RPCs used elsewhere — `src/routes/(app)/api/group/revoke-invite/+server.ts:25–35` — Wrap in an RPC (`revoke_invite(p_invite_id, p_group_id)`) that performs the ownership check atomically under the caller's session.

**Strengths:**

1. `requireAdmin` and `requireCronSecret` are extracted as reusable guards and applied without exception across all 14 protected admin and cron endpoints — timing-safe comparison in `requireCronSecret` is a notable security detail.
2. Domain rules (kickoff lock, once-per-week All-In, final-week exception) are faithfully mirrored in both `src/lib/domain/rules.ts` and `supabase/src/functions/picks/lock_pick.sql` (using `_get_final_week_unlimited_allin()`), satisfying the AGENTS.md "mirrored in TS and SQL" requirement with no observed gaps.
3. `hooks.server.ts` implements the `safeGetSession` pattern (getSession then getUser JWT validation) and derives `event.locals.isAdmin` exclusively from `users.role`, matching the `is_admin()` SQL function — the single source of truth documented in auth.md is correctly observed everywhere.

### DB SQL source — Maturity: 3

**Justification:** The declarative source pattern is well-organized and group_id tenancy is correctly threaded through all group-owned tables, views, and indexes per ADR-0002; notable friction comes from four duplicate schema prefix pairs that make intra-prefix ordering filesystem-dependent, redundant index definitions split across schema and index files, a picks policy duplicated between a schema file and the policies directory, and `lock_pick` auto-resolving group_id rather than accepting it as a parameter.

**Conformance findings** (drift from documented standards):

- [P1] `lock_pick` resolves `group_id` by selecting the caller's first membership by `joined_at, group_id` rather than accepting it as a parameter; ADR-0002 requires all group-owned writes to carry an explicit `group_id` scope — `supabase/src/functions/picks/lock_pick.sql:40-47` — Add a `p_group_id uuid` parameter, validate the caller is an active member of that group, and remove the implicit single-membership resolution.
- [P2] Four schema prefix pairs are duplicated (0215: comments + schedule_game_id; 0216: reactions + settings_final_week_allin; 0217: comments_deleted_at + group_membership_status_column; 0218: group_invites + guide_seen_at), making intra-prefix execution order filesystem-sort-dependent — `supabase/src/schemas/0215_comments.sql:1`, `supabase/src/schemas/0215_schedule_game_id.sql:1` (and the three other pairs) — Assign unique sequential prefixes when adding new schema evolution files; rename the four duplicate pairs to restore unambiguous ordering.
- [P2] `idx_picks_group_game_user` is defined both inline in `0210_pick_group_foreign_keys.sql:88-89` and in the dedicated `indexes/idx_picks_group_game_user.sql`; `idx_pick_settlement_game` is likewise defined inline in `0202_pick_settlement.sql:31` and in `indexes/idx_pick_settlement_game.sql` — drop the inline definitions and let the dedicated index files be the single source of truth.
- [P2] Picks RLS policies (`sel_picks_owner_or_started`, `ins_picks_own_pre`, `upd_picks_pre`) are defined in both `supabase/src/schemas/0300_rls.sql:49-77` and `supabase/src/policies/40_policies_picks.sql`, creating two canonical locations for the same policy — mark the `0300_rls.sql` copies as superseded with a comment pointing to the policies directory, or remove them via an explicit `drop policy if exists` file.

**Pattern-quality findings** (maintainability / scalability of the pattern itself):

- [P2] `lock_pick_all_groups.sql` duplicates the All-In enforcement logic and active-line snapshot query from `lock_pick.sql` verbatim, with inline comments "mirrors lock_pick.sql:70-93"; a rule change must be applied in both files — `supabase/src/functions/picks/lock_pick_all_groups.sql:87-111` — Extract the shared enforcement into a private `_private` helper function and have both public functions delegate to it.
- [P3] `0401_unique_game_external.sql` bundles constraint DDL and data-cleaning CTEs across five tables (games, teams, seasons, weeks, game_lines) in a single file, violating the one-primary-object rule; the README grandfathers unchanged legacy bundles but this file is an evolution artifact that will be confusing as a reference point — `supabase/src/schemas/0401_unique_game_external.sql:1-62` — Add a header comment flagging it as a grandfathered migration bundle and note that future constraint changes must go in dedicated single-object files.

**Strengths:**

1. All group-owned tables (picks, pick_settlement, comments, reactions) carry correctly ordered `group_id`-leading composite indexes per ADR-0002, and the picks primary key was correctly migrated to `(group_id, user_id, game_id)` with the matching unique constraint.
2. Every analytical view uses `security_invoker = on` and projects `group_id` as a column, correctly delegating RLS to the caller and making group-scoped filtering possible without extra joins.
3. Function files uniformly close the implicit `PUBLIC execute` grant with `revoke execute ... from public, anon` immediately after the function body and re-open only to named roles, reinforcing the closed-by-default baseline from `0001_role_baseline.sql`.

### Migrations & ledger — Maturity: 3

**Justification:** The generator and ledger integrity machinery are robust, CI-gated, and error-closed, but naming discipline has broken down (24 of 63 migrations carry the generic default name, six schema-prefix pairs are duplicated), two early migrations are confirmed hand-edits, and the documented squash plan (ADR-0012 PR2) remains unexecuted, leaving the LEGACY freeze and `zz_*` ordering hacks live — "works today, notable friction at scale."

**Conformance findings** (drift from documented standards):

- [P1] Two migrations lack the generator header and contain raw hand-authored DDL/TCL: `20250908010957_fix_function_grants.sql` (2-line bare grant, no header) and `20250916155742_resolve_diff.sql` (full transaction block with `set lock_timeout`, `begin;`, `create unique index`, `do $$` guard) — violates README.md:83 ("Never edit `supabase/migrations/` by hand") and database.md table row for `supabase/migrations/` — when PR2 squash lands, confirm neither file is accidentally re-authored; until then these are forward-only historical artefacts but their existence is a process gap.
- [P2] 24 of 63 migrations are permanently named `migrations_patch`, the generator's fallback (`supabase/scripts/generate-migration.ts:353`) — README.md:86 documents `--name=describe_the_change` as the expected invocation; the generic names provide no searchable context — enforce the name convention in code review or via a generator guard.
- [P2] ADR-0012 (`docs/adr/0012-migration-history-rebaseline.md:4`) status is still "Proposed" despite PR1 (`20260626152357_closed_by_default_baseline.sql`) having landed; ADR states "Set status to `Accepted` once PR1 is in prod" — advance the status and open the tracked PR2 issue to keep the plan and the repo state in sync.

**Pattern-quality findings** (maintainability / scalability of the pattern itself):

- [P2] Six numeric-prefix pairs are duplicated in `supabase/src/schemas/` (`0000_extensions`/`0000_function_acl_guard`, `0101_cover_side`/`0101_pick_outcome`, `0215_comments`/`0215_schedule_game_id`, `0216_reactions`/`0216_settings_final_week_allin`, `0217_comments_deleted_at`/`0217_group_membership_status_column`, `0218_group_invites`/`0218_guide_seen_at`) — the prefix was meant to express unique load order; `walkSqlFiles` resolves ties by `localeCompare` (generate-migration.ts:64), making actual order implicit — the squash is the natural fix; until then, new schema files must pick an unused prefix.
- [P2] Generator provides no guard when `migrationName` equals the default `'migrations_patch'` (generate-migration.ts:353) — adding a `console.warn` or requiring `--name` to differ from the default would prevent the 24 permanently unnamed migrations from growing further.
- [P3] `LEGACY_MULTI_OBJECT_SOURCES` freeze (generate-migration.ts:44-48) keeps `schemas/0100_enums.sql`, `schemas/0200_tables.sql`, and `functions/auth/handle_new_auth_user.sql` locked byte-for-byte, blocking grant co-location and reorganisation — resolves only on ADR-0012 PR2 squash; no interim fix needed, just track it on the issue.
- [P3] `grants/zz_group_grants.sql` and `grants/zz_picks_fanout_grants.sql` encode load order in filenames (ADR-0012:18-20 acknowledged debt) — the `zz_` prefix is a workaround for a blanket-revoke ordering hazard that the closed-by-default baseline removes; delete these files in PR2.

**Strengths:**

1. Three-layer integrity check (source hash → ledger, ledger → migration filename existence, ledger → migration content hash via `migrationHash`) makes it impossible to silently drift a generated migration after the fact — `validateMigrationReferences` catches any post-generation edit immediately (generate-migration.ts:195-225).
2. `pnpm db:migration:check` / `--check` mode is wired into CI before both dry-run and production deploy, so an uncommitted source change or a tampered migration file is a hard gate rather than a soft convention.
3. Atomic ledger writes via temp-file-then-rename (generate-migration.ts:189-193) eliminate the risk of a partially-written ledger corrupting the integrity check if the process is interrupted.

### Auth / RLS / grants — Maturity: 4

**Justification:** The live trust boundary is coherent, documented, and well-tested — `is_admin()` ↔ hooks agree, the ADR-0011 closed-by-default baseline is genuinely implemented, and a pgTAP authz matrix backstops it — but two split-source-of-truth hazards (a stale duplicate RLS file and the still-present `zz_` grant hack with misleading comments) keep it from a 5.

**Conformance findings** (drift from documented standards):

- [P1] `schemas/0300_rls.sql` is a stale duplicate of the canonical `policies/*.sql` files — it re-declares the same policy names (`sel_games`, `sel_users`, `sel_picks_owner_or_started`, `admin_sel_settings`/`admin_all_settings`/`admin_sel_audit`/`admin_ins_audit`) that `policies/20_policies_read_core.sql`, `30_policies_users.sql`, `40_policies_picks.sql`, `50_policies_admin.sql` own, plus a second RLS-enable block already in `10_rls_enable.sql`. They have already diverged: `0300_rls.sql` lacks `del_picks_own_pre` (`policies/40_policies_picks.sql:41`) and `ins_audit_by_actor` (`policies/30_policies_users.sql:17`). This is the exact "split source of truth" ADR-0011 calls a root cause. It is also a phase-ordering landmine — `0300_rls.sql:48-93` creates policies referencing `public.is_member`/`game_has_started`/`is_admin` in the _schemas_ phase, before the functions phase, which would break a from-empty squash (ADR-0012). — `supabase/src/schemas/0300_rls.sql:1` — reduce to a header/no-op (cannot delete per generator rule); keep RLS-enable only in `10_rls_enable.sql` and policies only under `policies/`.
- [P2] ADR-0011 §8 requires the authz matrix to run on the incremental-apply (prod-equivalent, newest-migration-only) path, not just `db:reset`; `021` only runs under the pgTAP/reset path and no incremental-vs-reset CI gate is present. The ADR permits manual-for-now / CI-as-fast-follow, so this is a sanctioned deferral, but it is the sole automatic catch for the silent-strip class. — `supabase/tests/021_function_grant_baseline.sql:21` — track the incremental-apply harness so the deferral isn't lost.
- [P3] `auth.md` says the service-role client must be imported "only in `src/lib/server/**`," but it is also imported in `src/hooks.server.ts:7` and route server modules (`src/routes/(app)/picks/+page.server.ts`, `src/routes/(app)/api/.../+server.ts`). These are server-only by SvelteKit convention so the boundary holds, but the literal doc rule is narrower than the safe practice. — `docs/agent-context/auth.md:29` — reword to "server-only modules (`*.server.ts`, `+server.ts`, `src/lib/server/**`)".

**Pattern-quality findings** (maintainability / scalability of the pattern itself):

- [P1] The `zz_*` ordering hack persists with grants that misrepresent current reality. `zz_picks_fanout_grants.sql:4-10` justifies its `zz_` prefix by claiming `player_grants.sql` "opens with a blanket `revoke execute … from authenticated`" — but that blanket revoke was removed (`player_grants.sql:11-15` documents its intentional absence) and the closed-by-default baseline (`schemas/0001_role_baseline.sql`, `schemas/0000_function_acl_guard.sql`) now closes the door. The hack is functionally unnecessary and its rationale is an active maintenance trap; ADR-0011 §3's end-state is `zz_*` reduced to no-op. — `supabase/src/grants/zz_picks_fanout_grants.sql:4` — fold these grants into their object/table-grant files, reduce `zz_*` to a no-op header, and correct the comments. (ADR-0011 is Proposed, so this is partial-rollout drift, but the false comment is gradeable regardless.)
- [P3] `search_path` is inconsistently pinned across boundary helpers: `is_member`/`is_commissioner` and the DEFINER RPCs set `search_path`, but `is_admin()` (`functions/auth/is_admin.sql:1`) and `game_has_started()` (`functions/_private/game_has_started.sql:2`) do not. Both are INVOKER + `language sql` with schema-qualified refs so risk is low, but the asymmetry is avoidable. — `supabase/src/functions/auth/is_admin.sql:1` — pin `set search_path` on all security-relevant helpers for uniformity.

**Strengths:**

- `is_admin()` (`functions/auth/is_admin.sql:8`, `users.role = 'admin'`) and `event.locals.isAdmin` (`hooks.server.ts:104`, `role === 'admin'`) resolve admin from the same single source of truth — exactly as `auth.md`/ADR-0004/ADR-0006 require; commissioner authority stays orthogonal and RLS-keyed (`is_commissioner`).
- Strong, contract-encoding pgTAP backstop: `021_function_grant_baseline.sql` proves no PUBLIC/anon function surface, the born-closed event-trigger guard is installed, and positive/negative role controls hold; `019_authz_matrix.sql` covers the table/RLS reachability matrix — drift fails CI.
- The closed-by-default baseline is genuinely realized (event-trigger function closure + one-time reconcile in `schemas/0001_role_baseline.sql`, co-located grants on `is_admin`/`game_has_started` with loud rationale comments), `service_role` centralized in `admin_grants.sql`, and the service-role client (`src/lib/supabase/service.ts`) is server-only, lazily reading the secret from runtime `$env/dynamic/private` and never imported into client modules.

### Workflows / CI / deploy — Maturity: 4

**Justification:** ADR-0010's version-gated deploy and preview-control requirements are faithfully implemented; the thin cron-caller pattern is clean DRY reuse; but testing.md (and CLAUDE.md) state "lint never runs in CI" while ci-tests.yml runs a full `lint` job, creating active doc/code drift that misleads agents, and a Node version skew plus unpinned Vercel CLI introduce minor fragility.

**Conformance findings** (drift from documented standards):

- [P2] testing.md §"Lint is not in CI" and CLAUDE.md both state "`pnpm lint` / `pnpm check` — not run in CI", but `ci-tests.yml` has a dedicated `lint` job that runs both `pnpm run lint` and `pnpm run check` — `.github/workflows/ci-tests.yml:16-47` — update testing.md and CLAUDE.md to reflect that lint and svelte-check are now enforced in CI (the actual behavior is strictly better; the docs are just stale)
- [P2] testing.md says "CI only runs unit tests on PRs to master" but ci-tests.yml also runs a `build` job — `.github/workflows/ci-tests.yml:72-99` — same fix: refresh the documented CI scope to include the build gate
- [P2] Node version skew: `ci-integration.yml` uses `node-version: 20` while every other CI workflow (ci-tests, playwright, migrate-dry-run, migrate-db) uses Node 22 — `.github/workflows/ci-integration.yml:46` — pin to Node 22 to match; mismatched runtimes between integration and unit tests can hide Node-version-specific bugs

**Pattern-quality findings** (maintainability / scalability of the pattern itself):

- [P2] Both deploy workflows install Vercel CLI with `npm install -g vercel@latest` (unpinned) — `.github/workflows/deploy-prod.yml:70`, `.github/workflows/deploy-preview.yml:59` — pin to a specific major (e.g. `vercel@36`) so a breaking CLI release cannot silently break the only path to production
- [P2] `ci-pgtap.yml` runs bare `supabase start` without excluding heavy unneeded services (`-x realtime,storage-api,imgproxy,...`), unlike every other Supabase-starting workflow — `.github/workflows/ci-pgtap.yml:30` — add the same `-x` exclusion list used in ci-integration and playwright to cut startup time
- [P2] `clone-to-staging.yml` polls for `migrate-db.yml` with a hard 20×30 s ceiling; if migration is still running at 10 min the loop exits with `PENDING` non-zero and falls through to the abort check, but if no migration was triggered (supabase paths unchanged) `PENDING` also equals 0 on the first poll — the two cases are indistinguishable — `.github/workflows/clone-to-staging.yml:51-60` — add a "did a migration run exist at all?" pre-check (e.g. `gh run list --workflow=migrate-db.yml --commit "$GITHUB_SHA" --json databaseId | jq 'length'`) to gate the wait step and make the ambiguity explicit
- [P3] `migrate-dry-run.yml` connects to the production database (`secrets.SUPABASE_DB_URL`) from a PR-triggered workflow — `.github/workflows/migrate-dry-run.yml:53-57` — confirm that the `environment: Production` gate has required-reviewer protection configured; if not, any repo collaborator's PR would get read access to prod connection strings without approval

**Strengths:**

1. The thin cron-caller pattern (`_cron-call.yml` + five ~10-line callers) is exemplary DRY reuse — adding a new cron job is one file, zero duplicated HTTP/status/Sentry logic
2. Version-gated deploy in `deploy-prod.yml` faithfully mirrors ADR-0010's spec: HEAD vs HEAD^ version comparison, `--environment=production` pull, `--prebuilt --prod` deploy, auto-tagging GitHub Release on push but not on `workflow_dispatch`
3. Least-privilege `permissions` are scoped per-workflow (`contents: read` by default; `contents: write` only on deploy-prod for release tagging; `pull-requests: write` only on deploy-preview), and `cancel-in-progress: false` is correctly applied to all migration and deploy concurrency groups to prevent mid-run races

### Tests (4 tiers) — Maturity: 4

**Justification:** The four tiers are used correctly per the rubric — domain/pure logic in unit, server DB flows in integration, RLS/grants in pgTAP, and routes/auth in E2E — with the E2E 5-pillar framework (page objects, `data-testid` anchors, `beforeEach` isolation, built-preview CI runner, smoke/full gating, triage artifacts) explicitly and consistently implemented; grade is held from 5 by coverage thresholds that are defined but never enforced in CI, a `jsdom` environment misconfiguration in the integration runner, a duplicate pgTAP file prefix, and one permanently-skipped E2E auth flow.

**Conformance findings** (drift from documented standards):

- [P2] Coverage thresholds (70%/60% unit, 50%/40% integration) declared in configs are purely decorative — CI runs `pnpm run test:unit` without `--coverage` so thresholds are never enforced — `vitest.config.ts:59-64`, `vitest.integration.config.ts:38-43`, `.github/workflows/ci-tests.yml:70` — add `--coverage` flag to the CI unit step (and enforce integration thresholds similarly) so the declared gates actually gate
- [P2] Password reset E2E spec is permanently `test.skip`-ped with an unfixed routing root cause (E2E_RESET_USER has no group membership post-reset) — `tests/e2e/auth.spec.ts:89` — seed E2E_RESET_USER into a group inside `global-setup.ts` to unblock the test; auth flow is listed in the "when to run" matrix as requiring e2e coverage
- [P3] Two pgTAP files share the `012_` numeric prefix making execution order ambiguous — `supabase/tests/012_schedule_sync.sql` and `supabase/tests/012_picks_reveal_after_kickoff.sql` — renumber one file to restore strict sequential ordering
- [P3] Two integration test files use legacy `createSupaClient()` from `_helpers.ts` (hardcoded URL + demo JWT string literal) while the rest of the suite uses env-var-driven `createServiceClient()` from `_auth.ts` — `tests/integration/grading.test.ts:2`, `tests/integration/selfSignup.test.ts:15` — migrate to `_auth.ts` and retire `_helpers.ts`
- [P3] `sign-in-methods.spec.ts` asserts on bare UI copy strings (`'Sign-in methods'`, `'Email / Password'`) violating Pillar 1 "Address chrome through `data-testid` anchors, not visible text" — `tests/e2e/sign-in-methods.spec.ts:6,13` — add `data-testid` anchors to the settings page's sign-in methods section and a `helpers/settings-page.ts` page object

**Pattern-quality findings** (maintainability / scalability of the pattern itself):

- [P1] The smoke set covers only 5 tests (sign-in, picks write path, leaderboard, stats, active-member routing) but has no smoke coverage for the group-switcher, comments/reactions, invite-join, or create-group flows — `tests/e2e/group-switcher.spec.ts`, `tests/e2e/comments.spec.ts`, `tests/e2e/join-invite.spec.ts`, `tests/e2e/create-group.spec.ts` — tag one representative test per flow `@smoke` to bring the required-gate scope closer to the pillar-4 intent; keep the set lean (target 8–10 total)
- [P2] `vitest.integration.config.ts` sets `environment: 'jsdom'` for tests that are purely server-side HTTP calls to a Supabase instance — `vitest.integration.config.ts:10` — change to `environment: 'node'`; jsdom adds browser-simulation overhead and makes it possible to accidentally introduce DOM mocks into integration tests, blurring the tier boundary
- [P2] The `smoke` workflow job comment says it "is the check meant to be REQUIRED in branch protection" but branch protection itself cannot be verified from code — `docs/agent-context/testing.md:117-118`, `.github/workflows/playwright.yml:14-15` — confirm the `smoke` check is marked required in GitHub repo settings; without that, the whole pillar-4 gating mechanism is advisory only

**Strengths:**

1. Page-object pattern is exemplary — every E2E spec delegates all locators to `tests/e2e/helpers/` files keyed on `data-testid` anchors, meaning UI copy changes require editing exactly one file; `picks-board.ts` is a reference implementation worth propagating to other layers.
2. Per-test isolation via `resetPicksForGame()` in `beforeEach` (coordinated through the shared `tests/e2e/helpers/seed.ts` service-role helper) is exactly what pillar 2 specifies — no spec depends on another's leftover state and the helper throws loudly on misconfiguration rather than silently skipping.
3. pgTAP coverage is exceptionally deep for a project of this size — 21 test files covering RLS matrices, grant baselines, function ACL guards, cross-group isolation, and authz role matrices, with the `021_function_grant_baseline.sql` "born-closed" proof test serving as a forward-looking regression backstop that scales with future schema additions.

### Types & config / tooling — Maturity: 3

**Justification:** Scripts and docs are perfectly aligned and TypeScript strict mode is on, but the primary documented ESLint enforcement rule (`no-explicit-any: error` for `src/lib` + `src/routes`) is mis-configured at `warn` instead of `error`, and two production-path `src/lib` files carry `any` that a correctly-wired rule would have rejected.

**Conformance findings** (drift from documented standards):

- [P1] `@typescript-eslint/no-explicit-any` is documented as `error` under `src/lib` + `src/routes` (AGENTS.md "Testing & CI"), but `eslint.config.js` only inherits `ts.configs.recommended` which sets the rule to `warn`; there is no explicit `error` override block for those paths — `eslint.config.js:12-51` — Add a scoped override `{ files: ['src/lib/**', 'src/routes/**'], rules: { '@typescript-eslint/no-explicit-any': 'error' } }` so the stated policy is actually enforced.
- [P2] Two non-test `src/lib` files contain `any` that `error`-level enforcement would have blocked: `src/lib/pwa/client.ts:11` (`navigator as any` — use `(navigator as unknown as { standalone?: boolean })`), and `src/lib/utils.ts:9,11` (`T extends { child?: any }` — replace with `unknown`). These exist because the rule is only `warn`. — `src/lib/pwa/client.ts:11`, `src/lib/utils.ts:9,11` — Fix the types and wire the rule correctly.
- [P3] `src/lib/types/supabase.ts` has no in-file generated-file banner (`// @generated` / `// DO NOT EDIT`). Every doc explicitly calls it generated and never-hand-edited, but a file-level signal is absent and nothing in the `db:types` redirect pipeline adds one — `package.json:25` + `src/lib/types/supabase.ts:1` — Wrap the script to prepend a `// @generated — regenerate with pnpm db:types` line.

**Pattern-quality findings** (maintainability / scalability of the pattern itself):

- [P2] `db:backfill:local/dev/prod` scripts hard-code an absolute Windows path `C:/Users/dough/code/sunday_bets/NFL 2025.xlsx` — `package.json:10-12` — Accept the file path as a required positional argument passed through from the npm script invocation so another machine or a CI job can supply its own path.
- [P3] `svelte.config.js` enables `kit.experimental.tracing` and `kit.experimental.instrumentation` with no comment explaining which integration requires them or when they can graduate — `svelte.config.js:11-19` — Add an inline comment referencing the Sentry SvelteKit integration that drives this choice.
- [P3] The `prepare` script chains `svelte-kit sync || echo ''` and `git config ... || true`, silently swallowing any failures — `package.json:32` — Use separate script steps or log-on-failure so a broken sync is visible rather than hidden.

**Strengths:** (1) Every `pnpm` command in CLAUDE.md maps 1-to-1 to a `package.json` script with zero drift — a strong maintainability signal. (2) The vendored shadcn `src/lib/components/ui/**` is consistently excluded in both `eslint.config.js` (ignore) and `tsconfig.json` (exclude), preventing accidental lint/type-check noise on un-owned code. (3) `db:push:local` automatically chains `pnpm db:types`, making the generated-types regeneration mandatory rather than opt-in after every local schema push.

### Delivery / process governance — Maturity: 4

**Justification:** Exemplary, internally consistent governance design (clear source-of-truth table, single-writer model, changelog-in-PR, ADR trigger test) that is mostly followed, but with concurrent, demonstrable drift on every axis checked — stale ADR statuses, a behind changelog, and ADRs shipping without issues — keeping it from a 5.

**Conformance findings** (drift from documented standards):

- [P1] ADR-0010 and ADR-0011 shipped but are still listed `Proposed` in both the index and the ADR headers. PR #238 (`daec220` gate deploys behind version bumps) and PR #242 (`5be8da7` ADR-0010 runtime-secret note) implemented 0010; PR #243 (`5ac0154` closed-by-default function/table grant baseline) implemented 0011 — yet `docs/adr/README.md:50-51` and `docs/adr/0010-production-release-gating.md:3` / `docs/adr/0011-grant-and-rls-baseline-pattern.md:3` all say `Proposed`. AGENTS.md and WORKFLOW.md already cite ADR-0010 as the governing, in-force decision (`AGENTS.md:48`, `docs/WORKFLOW.md:179`). Fix: promote both to `Accepted` in the ADR header and the index table. (ADR-0012 squash appears genuinely un-shipped, so its `Proposed` is accurate.)
- [P1] CHANGELOG is behind by ~6 merged PRs from a single day, including a feature with an Accepted ADR. The 2026-06-26 section (`docs/CHANGELOG.md:36-38`) has only the issue-less `set_active_line` entry, but git shows #214 global picks fan-out (PR #239, ADR-0009), #218 comment display-name, #237/#234 e2e, #235 svelte-state all merged that day with no entry. This directly violates "one terse, newest-first entry per merged issue" (`AGENTS.md:123-128`, `docs/WORKFLOW.md:162-164`) and falsifies the file's own promise that it "cannot drift" (`docs/CHANGELOG.md:14-16`). Downstream impact: the `reconcile-blocked` / `release-status` skills read this file to decide what shipped, so the omission of #214 can mislead automated unblocking. Fix: backfill the missing issue-numbered PRs and treat the entry as a hard `finish-pr` gate.
- [P2] Recent ADRs shipped without a driving issue, contradicting the lifecycle's own "link the driving issue" step (`docs/adr/README.md:28-29`) and the issue-led-delivery standard (ADR-0001, `AGENTS.md:88-101`). ADR-0010 records `Issue: None` (`docs/adr/0010-production-release-gating.md:5`); ADR-0011 and ADR-0012 record `Issue: # (pending)` (`docs/adr/0011-grant-and-rls-baseline-pattern.md:5`, `docs/adr/0012-migration-history-rebaseline.md:5`). Fix: open retroactive tracking issues or record an explicit "no issue, approved plan" rationale consistently.
- [P3] ADR numbering gap at 0008 is unexplained. The index jumps from ADR-0007 to ADR-0009 (`docs/adr/README.md:48-49`) and no `0008-*.md` exists in `docs/adr/`. Readers cannot tell whether 0008 was abandoned, rejected, or skipped. Fix: add a one-line index note (e.g. "0008 — withdrawn/never used") so the gap is intentional and auditable.

**Pattern-quality findings** (maintainability / scalability of the pattern itself):

- [P1] ADR Status is duplicated between each ADR file header and the README index table and synced by hand, so it drifts exactly as WORKFLOW.md warns against ("Do not duplicate live status" `docs/WORKFLOW.md:20`). This duplication is the direct cause of the 0010/0011 staleness above and will keep recurring as ADR count grows. Fix: make one source authoritative (e.g. generate the index Status column from the ADR headers, or drop Status from the table and link out).
- [P2] The changelog rule keys entries to issues ("one entry per merged issue", `docs/CHANGELOG.md:18-19`) but a large and growing share of merged PRs are issue-less chores/skills/infra (#244 pattern-audit skill, #243 grant baseline, #242 vercel fix, #236 fix-button, #228 update-deps). The team's observed response was to delete rather than log such work (`ce8c7f7` "revert: remove changelog entry (no issue number)"), so infra/skill changes become invisible in the one log meant to answer "is X done?". Fix: extend the convention to cover issue-less PRs (log by PR number) so the shipped-history log is complete.
- [P3] "Confirm before any GitHub write — see user-level AGENTS.md" (`AGENTS.md:53`) points at a file not present in this repo; the actual user-level rule lives in `C:\Users\dough\CLAUDE.md`. The cross-reference is a soft dangling pointer. Fix: name the file that actually exists or make the reference generic.

**Strengths:** The source-of-truth table (`docs/WORKFLOW.md:7-21`) with its explicit "don't duplicate live status" rule is a clean, scalable backbone worth propagating. The changelog-rides-inside-the-PR design (`docs/CHANGELOG.md:13-16`) is the right anti-drift mechanism — it just needs to be enforced as a gate. AGENTS.md and WORKFLOW.md are genuinely self-consistent on the load-bearing rules (release gating via ADR-0010, version-bump deploy trigger, worktree isolation, issue-led delivery), and the trigger-test + lifecycle in `docs/adr/README.md:9-37` plus the skill-encoded workflow (issue-author, finish-pr, reconcile-blocked) make the process executable rather than aspirational.

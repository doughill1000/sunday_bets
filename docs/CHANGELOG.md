# Changelog — shipped work

A terse, newest-first log of what has shipped to `master`, one entry per merged
issue/PR. It exists so an agent can answer **"is X already done?"** by reading this
file instead of reverse-engineering completion from source code.

**GitHub stays authoritative.** This is convenience _shipped history_ (the same
category as GitHub Releases), not live status. Closed Issues, merged PRs, the GitHub
Project `Done` column, and Releases remain the sources of truth — see
`docs/WORKFLOW.md`. For anything newer than the latest entry here, check `gh`.

## How entries are added

- The entry is added **inside the feature's own PR** (a step in the `finish-pr`
  skill), so it merges atomically with the code. The entry exists in `master` if and
  only if the work does — it cannot drift.
- **Newest first.** Group entries under a `## YYYY-MM-DD` date heading (the PR-open
  date is fine).
- Keep each entry to one line — issue/PR number, a short title, and what changed.
  Add the notable tables/views/routes/files touched and the governing ADR when they
  help a future reader. Example of the richest form:

  ```
  ## 2026-07-12
  - **#142** Drop-worst-week scoring — season scoring drops each player's lowest
    week. tables: group_rules · view: season_leaderboard · ADR-0006
  ```

- **Every merged PR gets an entry — including issue-less ones.** Chores, skills,
  CI/infra, and docs PRs that close no issue are still logged, keyed by PR number and
  written `**PR #NNN**` to distinguish them from issue numbers (`**#NNN**`). This keeps
  the log a complete answer to "is X already done?" rather than a features-only subset.
- This is a shared file: top-of-file edits from two in-flight PRs can conflict.
  Resolve by **keeping both entries** (never take one side wholesale), consistent
  with the serialize-shared-files rule in `docs/WORKFLOW.md`.

> History before the first entry below lives in **GitHub Releases (v1.2–v1.7)** and
> the `ROADMAP.md` "Shipped" section; this log is not backfilled past that.

## 2026-06-26

- **#191** Performance: picks N+1 + materialized leaderboard/stats — (A) collapsed the picks page's per-started-game comments/reactions N+1 (up to ~26 queries) into 2 batched `.in('game_id', …)` queries via new `getCommentsForGames`/`getReactionsForGames`; (B) converted the 8 leaderboard/stats aggregation views (`leaderboard_season_totals`, `stats_season_trend`, `stats_accuracy_by_team`/`_weight`/`_head_to_head`/`_alltime` ×3) to **materialized views**, each with a unique natural-key index, served read-only to `service_role` (matviews aren't covered by the blanket table grant and can't carry RLS). New `public.refresh_leaderboard_stats()` (SECURITY DEFINER, `REFRESH … CONCURRENTLY` ×8) is called by `src/lib/server/grading.ts` after every grade (best-effort: logged, never fails the grade), by the `/api/group/update-config` route after a `drop_worst_week` toggle (#154 input feeds the leaderboard), and by the demo seed, prod-clone, and integration fixture. Leaderboard/stats reads drop from a full multi-join aggregation to an index scan. pgTAP `023` added; `007`/`011`/`013`/`015` refresh before asserting. Closes #191. views→matviews + `refresh_leaderboard_stats` · `getCommentsForGame(s)`/`getReactionsForGame(s)` · ADR-0013
- **#177** House grading preset — `group_config.grading_preset` ('house'|'gamer', default house) selects the line rule per group; House grades all members on the closing line (`game_lines.is_closing_line`, flagged write-once at first grade by new `_capture_closing_line`); preset frozen per settlement (`pick_settlement.graded_preset`, backfilled 'gamer' for all existing history so no re-grade occurs). Original group moved to House going forward; per-settlement freeze preserves Gamer history byte-identically. Branch in `_grade_games_by_ids`. Closes #177. tables: `group_config`, `game_lines`, `pick_settlement` · ADR-0007 (Amendment 2026-06-26)
- **#249** Finish the ADR-0012 follow-ups (last three open items) — (1) **pgTAP offline bootstrap**: vendored the basejump `supabase_test_helpers` v0.0.6 helper DDL directly into `supabase/tests/000_setup.sql` (only change from upstream is dropping the `\echo … \quit` load-guard), removing the per-run `api.database.dev` fetch and the `http`/`pg_tle`/dbdev installs, so the pgTAP suite no longer fails when that endpoint is slow or unreachable; (2) **promoted `db:migration:verify` to a required gate** — removed `continue-on-error` (and the now-redundant drift-warning step) from `.github/workflows/ci-migration-verify.yml` now that the squashed `src/**` reproduces the single baseline from empty (the `is_member`/`game_has_started`/`is_admin` helpers emit in the schemas phase ahead of the inline policies that call them); (3) flipped **ADR-0012 → `Accepted`**. Closes #249. Dev-infra, no app behavior change. files: `supabase/tests/000_setup.sql`, `.github/workflows/ci-migration-verify.yml`, `docs/adr/0012-migration-history-rebaseline.md` · ADR-0011 · ADR-0012
- **#249** Gated prod/staging reconciliation (ADR-0012 §4 post-squash) — completed the three deferred bookkeeping/ACL steps the squash PR left open, run against **prod** (`anzcshrpfpxajcgrwczv`) and **staging/QA** (`eoncckeqqogezoftooix`) via the Supabase MCP under explicit confirmation, each in a transaction with trailing verification: (1) **`migration repair`** — `supabase db push` was failing (_"Remote migration versions not found in local migrations directory"_) because both remotes still listed all 64 pre-squash versions; reverted them and marked the single `20260626184826_baseline` applied **without executing DDL** (prod already contains every object); (2) **dropped 2 prod-only orphan functions** (`current_active_line(uuid)`, `fn_picks_lock_guard()`) — absent from `src/`/baseline, no trigger/view/policy/default dependents; (3) **tightened `authenticated` table grants** — cleared the legacy pre-ledger `GRANT ALL` (which PR1 never blanket-revoked by design) and re-granted exactly the baseline's tight per-table subset (16 tables; everything else now grants `authenticated` nothing). prod + staging `authenticated` ACLs are now identical and match the baseline. No app behavior change (offseason, no live users; reads flow through the service-role layer). As-run record: `docs/runbooks/adr-0012-prod-reconciliation.md`. Still open under #249: pgTAP offline-bootstrap hardening, promoting `db:migration:verify` to a required gate, and flipping ADR-0012 to `Accepted`. · ADR-0011 · ADR-0012
- **#249** Migration history squash (ADR-0012 PR2) — collapsed 63 migrations / ~8.3k lines into a single regenerated baseline that reproduces prod's schema exactly. Split the three frozen `LEGACY_MULTI_OBJECT_SOURCES` bundles (`0100_enums`→weight/side enums, `0200_tables`→11 one-table files, `handle_new_auth_user`→+`handle_updated_auth_user`) into one-object files; relocated `is_member`/`game_has_started`/`is_admin` into the schemas phase (`0050`/`0051`/`0052`) so inline RLS policies resolve from empty; de-`zz_`'d the grant files; collapsed the `game_lines` active-line index/constraint tangle (removed the order-dependent `uq_game_lines_game_source` + `ux_active_line_per_game` churn, leaving `ux_game_lines_active` + `ux_game_lines_active_per_source`); and emptied `LEGACY_MULTI_OBJECT_SOURCES`. Proved the baseline reproduces the pre-squash schema **and** prod by normalized catalog hash (structure + per-function ACLs identical). Also fixed three stale src over-grants (`attach_line_to_matchup`/`upsert_game_by_external_id`/`upsert_game_by_matchup` were `to authenticated`; prod is service_role-only). `db:migration:verify` now GREEN. Local-only; the gated prod `migration repair` + orphan-fn drop + authenticated table-grant tightening is deferred. Dev-infra, no app behavior change. files: `supabase/src/**` (reorg), `supabase/migrations/*_baseline.sql`, `.migration-hash.json`, `generate-migration.ts` · ADR-0011 · ADR-0012
- **#248** Reconcile delivery/process governance drift — promote ADR-0010/0011 to `Accepted`; make each ADR header the sole status source (drop the index `Status` column, add a 0008-gap note); backfill this day's missing CHANGELOG entries (incl. #214 / ADR-0009 global picks); standardize the ADR-0011/0012 `Issue:` rationale; extend the changelog convention to issue-less PRs (`PR #NNN`) and mark the entry a hard `finish-pr` gate; fix the `AGENTS.md` user-level dangling pointer; normalize ADR-0002 status. Docs-only, no runtime change. files: `docs/adr/`, `docs/CHANGELOG.md`, `AGENTS.md`, `docs/WORKFLOW.md`, `.claude/skills/finish-pr/` · ADR-0001
- **PR #247** Pattern audit — layered, parallel grading of the repo's established patterns against its own standards (AGENTS.md, ADRs, agent-context packs): nine lanes scored on conformance + pattern-quality (maturity 1–5). Report only, no runtime change. file: `docs/audits/2026-06-26-pattern-audit.md`
- UI grade fixes (no issue) — five conformance/pattern patches from the pattern-audit UI layer: `OddsSyncCard` prop mutation → local `$state` copy; `WeightSelect` clarified as writable-`$derived` (Svelte 5.25+); deleted dead `src/lib/stores/leaderboard.ts` + spec; extracted `ACTIVE_TAB_TRIGGER_CLASS` to `src/lib/ui/tabs.ts`; moved `:global(.team-btn)` rules from `TeamSelect.svelte` to `app.css` under `.picks-board` scope. files: `OddsSyncCard.svelte`, `WeightSelect.svelte`, `TeamSelect.svelte`, `PicksBoard.svelte`, `app.css`, `src/lib/ui/tabs.ts`, leaderboard+stats `+page.svelte`
- **#246** Migration drift guard — new `pnpm db:migration:verify` (`supabase/scripts/verify-src-reproduces-migrations.ts`) plus a non-blocking CI job (`.github/workflows/ci-migration-verify.yml`) that applies `supabase/src/**` from empty and diffs the resulting `public` schema against the full migration chain, normalizing away ACL / owner / `\restrict` / column-order noise (the local CLI's legacy table `GRANT ALL` differs from prod, so ACLs must be ignored). Closes the blind spot in `db:migration:check` (ledger-hash only) that let `src/` silently drift from prod. Informational until the deferred ADR-0012 history squash fixes the inline-policy→function apply ordering (the from-empty baseline currently fails on `is_member` not existing yet); promote to a required gate once green. Dev-infra, no app change. files: `verify-src-reproduces-migrations.ts`, `generate-migration.ts` (exports `SOURCE_ORDER`/`collectSources`) · ADR-0011 · ADR-0012
- **#245** set_active_line src↔prod reconcile — realigned `supabase/src/functions/odds/set_active_line.sql` to prod's deployed state on two axes: (1) **body** — restored prod's declare/begin version (game/spread validation + favorite-sign normalization + plain INSERT), replacing a stale src-only upsert/`ON CONFLICT` rewrite that was never a deployed migration; (2) **grant** — tightened the inline grant to `service_role` only, dropping a stale `authenticated` grant that a later blanket `revoke execute … from authenticated` (migration `20260625204117`) had already stripped from prod. The generated `reconcile_set_active_line` migration is a true no-op on prod (`create or replace` of the identical body; `service_role` already granted; `authenticated` already revoked) — it only re-syncs `src/` so a from-empty regen reproduces prod, and makes the pgTAP `tests/021` set_active_line negative control pass locally. Dev-infra, no app behavior change — set_active_line is invoked only via the service-role client (`src/lib/server/db/commands/setActiveLine.ts`). function: `set_active_line` · ADR-0011
- **PR #244** Pattern-audit skill — adds the `pattern-audit` skill (fans out a subagent per repo layer, writes a maturity-scored report to `docs/audits/`). Dev-infra, no runtime change. dir: `.claude/skills/pattern-audit/`
- **PR #243** Closed-by-default function/table grant baseline — born-closed ACL: event-trigger function-ACL guard + one-time reconcile in `0001_role_baseline`, grants re-open only to named roles; pgTAP `021_function_grant_baseline` proves no PUBLIC/anon function surface. schemas: `0000_function_acl_guard`, `0001_role_baseline` · ADR-0011
- **PR #242** CI Vercel build fix — make the gated Vercel build run in CI (pnpm install + runtime secrets) so the version-gated deploy path works end-to-end. workflows: `deploy-prod`/`deploy-preview` · ADR-0010
- **PR #240** ADR records — adds ADR-0011 (closed-by-default grant/RLS baseline) and ADR-0012 (migration-history rebaseline/squash). Decision records, no runtime change. ADR-0011 · ADR-0012
- **PR #241** Docs — mark the app as not in active use during migration work (relaxes the live-traffic constraint on disruptive DB changes; migration discipline otherwise unchanged).
- **#214** Global picks — a pick made once is fanned out at write time to all the player's active groups, so it counts in every group (replaces single-group writes). function: `lock_pick_all_groups` · ADR-0009
- **PR #238** Gate prod deploys behind version bumps — Vercel auto-deploy off; production ships only on a `package.json` `"version"` bump (or manual dispatch), and a PR gets one preview on open/ready/reopen plus on-demand `/preview`. workflows: `deploy-prod`/`deploy-preview` · ADR-0010
- **PR #218** Comments — show the author's display name optimistically right after posting (was briefly blank until reload). component: `CommentsSection`
- **PR #237** E2E — stabilize the Playwright suite and fix a picks hydration regression it surfaced.
- **PR #236** Fix a UI button regression.
- **PR #235** Fix Svelte 5 `$state`/runes warnings flagged by `svelte-check`.
- **PR #234** E2E pipeline — per-test isolation (`resetPicksForGame` in `beforeEach`), deterministic built-preview CI runner, and smoke/full gating. dir: `tests/e2e/`
- **PR #233** E2E — decouple remaining specs from UI copy via `data-testid` anchors.
- **PR #232** E2E — decouple picks specs from UI copy via `data-testid` anchors.
- **PR #228** Update dependencies.
- **PR #227** E2E — seed games by matchup so the `uq_games_matchup` unique constraint can't collide across specs.

## 2026-06-25

- **#178** Results-recap notification — once a week is fully graded, the grade cron sends each opted-in user one push summarizing their record and net points (aggregated across all their groups), deep-linking to `/leaderboard`. New `results_recap` notification pref (default on) with a settings toggle; deduped per (user, week) via `notification_log` (`kind='results_recap'`). No schema change. files: `sendResultsRecap`/`isWeekFullyGraded` in `src/lib/server/notifications.ts`, `formatRecapBody` in `src/lib/domain/notifications.ts`, cron `api/cron/grade`, settings page
- **#153** Commissioner RLS hardening + grant/permission audit — stripped Supabase's default anon/PUBLIC ACL from every table with no anon RLS policy (anon now gets `permission denied`, not RLS-filtered rows, on `games`/`game_lines`/`results`/`totals`/`users`/`weeks`/`seasons`/`teams`/`picks`/`pick_settlement`/`settings`/`audit_log`); locked `group_memberships` INSERT to no-client-write (`with check (false)` + dropped the `insert` grant — all membership writes already flow through SECURITY DEFINER RPCs / service role); added the `group_id`-leading `idx_picks_group_game_user` index (ADR-0002 query discipline); added pgTAP `019_authz_matrix` covering the anon / member / non-member / commissioner authorization matrix. grants: `player_grants`/`zz_group_grants` · policies: `25_policies_groups` · ADR-0002 · ADR-0006
- **#220** Delete own comments — each comment a member authored shows a delete (✕) control that hard-deletes it via the existing `DELETE /api/comments/:gameId` endpoint (RLS `del_comments_own` already gates to the author). Optimistic removal with rollback on failure; UI-only change. component: `CommentsSection`
- **#92** PWA install and notification engagement prompts — platform-aware dismissible banner encourages install (iOS Share→Add, Android native prompt, or browser-menu fallback) and push notification enablement; dismissed per-device via localStorage; `beforeinstallprompt` lifted to shared module store; `hasPushSubscription()` added to push/client. components: EngagementBanner · modules: src/lib/pwa/
- **#150** Group switcher in the app shell — header dropdown lets users in more than one group switch the active group; the choice persists via the `active_group_id` cookie and reloads server data on switch. Renders only for multi-group users. component: `GroupSwitcher` · api: `/api/groups/switch` · ADR-0006
- **#151** Members list + commissioner basics — `rename_group`, `remove_member`, `promote_member`, `leave_group`, and `mint_invite` SECURITY DEFINER RPCs with last-commissioner guard (P0022) and full commissioner RLS. Group management UI at `/group` (members list, rename, promote/remove actions, invite minting/revoke/copy). functions: rename_group, remove_member, promote_member, leave_group, mint_invite · routes: `/group`, `/api/group/*` · pgTAP: 018_commissioner_basics · ADR-0006
- **#149** Join via invite flow — `/join/[code]` route: signed-in user redeems invite via `redeem_invite` RPC and lands in the group; signed-out user is sent to `/auth?next=/join/[code]` with the path preserved through both password and OAuth sign-in; friendly states for invalid/expired/revoked/exhausted codes; already-a-member routes straight to /picks. Invite preview reads through the `preview_invite` SECURITY DEFINER RPC (commissioner-only RLS would otherwise hide the invite from the invitee). routes: `src/routes/join/[code]` · auth: `src/routes/auth/+page.server.ts` (`next` param for password + OAuth) · functions: preview_invite · ADR-0006

## 2026-06-24

- **#148** Create-group flow (gated) — `create_group` SECURITY DEFINER RPC checks the global `group_creation_mode` (`gated`|`open`) and the per-user `can_create_group` capability, then atomically creates the group, seeds `group_config`, and adds the creator as commissioner; `/join` shows a name-input create form to eligible users. The gate flips to open via config, no migration. columns: `settings.group_creation_mode`, `users.can_create_group` · functions: create_group · routes: `/join` · pgTAP: 017_create_group · ADR-0006
- **#147** Invite tokens — `group_invites` table, commissioner RLS, and `redeem_invite` SECURITY DEFINER RPC. tables: group_invites · functions: is_commissioner, redeem_invite · pgTAP: 016_group_invites_rls · ADR-0006
- **#141** How to Play onboarding guide — dismissible welcome guide (Sheet on mobile, Dialog on desktop) auto-opens once for new users; shareable `/how-to-play` route; account-menu link. column: `users.guide_seen_at`
- **#188** Pre-v2 regression test suite — locks in gameplay behavior and
  group-isolation / self-sign-up boundaries before the v2.0 self-service-groups
  refactor. Adds two-group + self-signup integration fixtures, cross-group
  isolation tests (leaderboard/weekly/stats/picks), pgTAP
  `015_cross_group_stats_isolation`, All-In per-group enforcement, self-sign-up
  provisioning + multi-group determinism guard, admin-route authz (403 matrix +
  add-member group targeting), drop-worst-week via `getSeasonLeaderboard`, and the
  ATS scoring matrix. Verification only; no schema/runtime change. Bumps version to
  1.9.0. ADR-0002/0004/0005/0006
- **#186** PR-gated shipped changelog — adds this `docs/CHANGELOG.md` and wires it
  into `finish-pr`, `start-issue`, `AGENTS.md`, and `docs/WORKFLOW.md`.
- **#185** ADR-0007: line-and-lock grading preset (House vs Gamer) — decision record,
  no runtime change. ADR-0007
- **#176** Manage sign-in methods — list, link, and unlink auth identities.
- **#174** Harden the `cleanup-worktrees` skill against Windows removal failures.
- **#173** Graceful empty/pending state for users with no active group membership.
- **#172** Refactor leaderboard weekly cards to a team-grouped picks layout.
- **#171** Add the `cleanup-worktrees` skill and script.
- **#170** Wire `active_group_id` resolution and retire the `DEFAULT_GROUP_ID` stopgap.

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
- **Keep each entry short — a pointer, not a spec.** Include the issue/PR number, a
  short title, one or two sentences on _what_ changed and _why it matters_, the
  notable tables/views/routes/files touched (as bare pointers), and the governing
  ADR(s). The PR description, the code, and the ADR hold the detail — link to them,
  don't restate them. Example of the richest form an entry should reach:

  ```
  ## 2026-07-12
  - **#142** Drop-worst-week scoring — season scoring drops each player's lowest
    week. tables: group_rules · view: season_leaderboard · ADR-0006
  ```

- **Do not include the implementation narrative.** Leave out function/variable names
  and signatures, config values (TTLs, thresholds), enumerated test files, error
  codes, and step-by-step prod/runbook recaps. They duplicate authoritative sources
  that change without this file — a changelog that names a TTL or an internal symbol
  starts lying the moment either is changed. Name the file as a pointer (`auth.ts`),
  not the symbols inside it.

- **Every merged PR gets an entry — including issue-less ones.** Chores, skills,
  CI/infra, and docs PRs that close no issue are still logged, keyed by PR number and
  written `**PR #NNN**` to distinguish them from issue numbers (`**#NNN**`). This keeps
  the log a complete answer to "is X already done?" rather than a features-only subset.
- This is a shared file: top-of-file edits from two in-flight PRs can conflict.
  Resolve by **keeping both entries** (never take one side wholesale), consistent
  with the serialize-shared-files rule in `docs/WORKFLOW.md`.

> History before the first entry below lives in **GitHub Releases (v1.2–v1.7)** and
> the `ROADMAP.md` "Shipped" section; this log is not backfilled past that.

## 2026-06-27

- **#263** Cache the per-request auth-hook lookups (ADR-0014, now Accepted) — authenticated requests no longer pay two uncached service-role round-trips (`users` profile + `group_memberships`) on every hit; a per-instance TTL cache fronts them, and a cache miss still emits the #190 `auth-hook.*` Sentry spans (a hit emits none). The cache is a latency optimization, never the security boundary: `requireAdmin` re-reads `users.role` fresh/uncached so a demoted admin is denied immediately. Bust-on-write invalidation deferred. Closes #263. files: `auth-context-cache.ts`, `hooks.server.ts`, `auth.ts` · ADR-0014 · ADR-0002 · ADR-0011
- **#273** Fix stats tables overflowing on mobile — the four `/stats` accuracy tables side-scrolled on phones; compacted them responsively (mobile card gutter reclaimed, smaller text, "Accuracy"→"Win %" header) without losing data. UI/CSS only. files: `stats/+page.svelte`
- **#272** Fix 2026 schedule sync importing last season's games — ESPN's scoreboard endpoint silently ignores `season=` and returns the _current_ season, so the cron wrote 2025's completed games into a bogus 2026 season; now queries `dates=<year>` (the param ESPN honors) and discards year-mismatched responses, and creates the season lazily so an unpublished year leaves no blank shell. The bogus season was deleted from prod + staging. Closes #272. files: `schedule.ts`, `scheduleSync.ts` · ADR-0003
- **#152** Bounded, paginated leaderboards + member lists — keyset (cursor) pagination for the season leaderboard and group members list so reads stay bounded as groups grow (ADR-0002 query discipline). New service_role-only RPCs over the leaderboard matview (#191) and memberships, each backed by a `group_id`-leading keyset index; service_role-only because the server (not RLS) is the `group_id` trust boundary. Server/load layer only — no UI redesign. Closes #152. files: `pagination.ts`, stats/groups RPCs, `leaderboard`/`getGroupMembers` queries · ADR-0002 · ADR-0013
- **#222** Surface final-week unlimited All-In context — banner on `/picks` appears only when `isLastWeek && finalWeekUnlimitedAllin` telling players they can go All-In on every pick; one sentence added to the How to Play All-In section noting the final-week exception. Copy/UI only, no domain, server, or DB change. files: `PicksBoard.svelte`, `HowToPlay.svelte`
- **#223** Cap display names (40 chars) and group size (50), truncate long names in UI — truncated name spans in the comment/member UI, a new `users_display_name_max_len` check constraint with the auth triggers clamping to 40 chars, and `redeem_invite` rejecting joins once a group hits 50 members (join page shows "group is full"). Closes #223. schema: `users_display_name_max_len` · fns: `handle_new_auth_user`, `handle_updated_auth_user`, `redeem_invite` · route: `join/[code]` · ADR-0004 · ADR-0006
- **PR #270** Pre-authorize PR push + creation in `finish-pr` — drops the confirm-before-GitHub-write gate for `git push` + `gh pr create` only (merging/closing PRs and all issue/gist/repo writes still require confirmation). Dev-workflow convenience, no app change. files: `.claude/skills/finish-pr/SKILL.md`
- **#265** Label-driven SemVer version management (ADR-0015, Proposed) — `issue-author` assigns a `semver:*` label + milestone, `finish-pr` carries them onto the PR (and no longer bumps `package.json`), and the new `cut-release` skill computes the release version from the milestone's highest `semver:` label, bumps `package.json` in a release PR, closes the milestone, and triggers the manual prod deploy. `package.json` now holds the last-shipped version between releases. Closes #265. files: ADR-0015, `issue-author`/`finish-pr`/`release-status`/`cut-release` skills, `AGENTS.md`, `docs/WORKFLOW.md` · ADR-0015 · ADR-0010
- **#192** ADR-0014 (Proposed) — auth-context caching — records the decision to cache the two per-request auth-hook lookups as a latency optimization that is never the security boundary: RLS + the `group_id` filter stay the real boundary, and `requireAdmin` must verify `users.role` fresh/uncached. Docs/ADR only; produced implementation issue #263. Closes #192. files: `docs/adr/0014-auth-context-caching.md` · ADR-0014 · ADR-0002 · ADR-0011
- **#190** Scaling observability baseline — additive instrumentation for the latency/load signals that define "measured scale" (ADR-0002): new `observability.ts` traces the leaderboard/stats/picks loads and the per-request auth-hook DB reads as Sentry spans, and new `scalingSignals.ts` feeds a `/admin` "Scaling signals" card (notification-cron duration vs the Vercel function timeout). Tier A/B thresholds documented in `docs/observability/scaling-signals.md`. No behavior/schema change. Closes #190. files: `observability.ts`, `scalingSignals.ts`, `hooks.server.ts`, admin page · ADR-0002

## 2026-06-26

- **#191** Performance: picks N+1 + materialized leaderboard/stats — collapsed the picks page's per-started-game comments/reactions N+1 into 2 batched queries, and converted the 8 leaderboard/stats aggregation views to materialized views (service_role-only, each with a unique index) refreshed by a new `refresh_leaderboard_stats()` after every grade and config toggle (best-effort, never fails the grade). Reads drop from a multi-join aggregation to an index scan. Closes #191. views→matviews + `refresh_leaderboard_stats` · `getCommentsForGames`/`getReactionsForGames` · ADR-0013
- **#177** House grading preset — `group_config.grading_preset` ('house'|'gamer', default house) selects the line rule per group; House grades on the closing line (captured write-once at first grade), and the preset is frozen per settlement (`pick_settlement.graded_preset`, backfilled 'gamer') so existing history never re-grades. The original group moved to House going forward. Closes #177. tables: `group_config`, `game_lines`, `pick_settlement` · ADR-0007 (Amendment 2026-06-26)
- **#249** Finish the ADR-0012 follow-ups — vendored the pgTAP `supabase_test_helpers` DDL into `000_setup.sql` (no more per-run network fetch), promoted `db:migration:verify` to a required CI gate now that the squashed `src/**` reproduces the baseline from empty, and flipped ADR-0012 → Accepted. Dev-infra, no app change. files: `supabase/tests/000_setup.sql`, `ci-migration-verify.yml`, ADR-0012 · ADR-0011 · ADR-0012
- **#249** Gated prod/staging reconciliation (ADR-0012 §4 post-squash) — ran the three deferred ACL/bookkeeping steps against prod + staging via the Supabase MCP under confirmation: `migration repair` to the single baseline (no DDL re-run, since prod already contains every object), dropped 2 prod-only orphan functions, and tightened `authenticated` table grants to the baseline's per-table subset (clearing the legacy `GRANT ALL`). prod + staging ACLs now match the baseline. No app behavior change. As-run record: `docs/runbooks/adr-0012-prod-reconciliation.md` · ADR-0011 · ADR-0012
- **#249** Migration history squash (ADR-0012 PR2) — collapsed 63 migrations / ~8.3k lines into a single regenerated baseline, proven (by normalized catalog hash) to reproduce both the pre-squash schema and prod. Reorganized `supabase/src/**` into one-object files and relocated the RLS helper functions ahead of the inline policies that call them so the baseline applies from empty. `db:migration:verify` now GREEN; the gated prod reconciliation was deferred (done above). Dev-infra, no app change. files: `supabase/src/**`, `*_baseline.sql`, `.migration-hash.json` · ADR-0011 · ADR-0012
- **#248** Reconcile delivery/process governance drift — promoted ADR-0010/0011 to Accepted, made each ADR header the sole status source (dropped the index Status column), backfilled missing CHANGELOG entries, extended the changelog convention to issue-less PRs (`PR #NNN`), and made the entry a hard `finish-pr` gate. Docs-only. files: `docs/adr/`, `docs/CHANGELOG.md`, `AGENTS.md`, `docs/WORKFLOW.md`, `finish-pr` skill · ADR-0001
- **PR #247** Pattern audit — layered, parallel grading of the repo's established patterns against its own standards (AGENTS.md, ADRs, agent-context packs): nine lanes scored on conformance + pattern-quality (maturity 1–5). Report only, no runtime change. file: `docs/audits/2026-06-26-pattern-audit.md`
- UI grade fixes (no issue) — five conformance/pattern patches from the pattern-audit UI lane (prop-mutation → local `$state`, writable-`$derived` clarification, dead-store deletion, extracted tab-trigger constant, moved global team-button CSS into `app.css` scope). files: `OddsSyncCard.svelte`, `WeightSelect.svelte`, `TeamSelect.svelte`, `PicksBoard.svelte`, `app.css`, `src/lib/ui/tabs.ts`, leaderboard+stats pages
- **#246** Migration drift guard — new `pnpm db:migration:verify` + a CI job that applies `supabase/src/**` from empty and diffs the resulting `public` schema against the full migration chain (normalizing ACL/owner/order noise), closing the blind spot in `db:migration:check` (ledger-hash only) that let `src/` silently drift from prod. Informational until the ADR-0012 squash fixed the apply ordering, then promoted to a required gate. Dev-infra, no app change. files: `verify-src-reproduces-migrations.ts` · ADR-0011 · ADR-0012
- **#245** `set_active_line` src↔prod reconcile — realigned `src/functions/odds/set_active_line.sql` to prod's deployed body and `service_role`-only grant (a stale src-only upsert rewrite and `authenticated` grant had drifted from prod). The generated migration is a true prod no-op that only re-syncs `src/` for from-empty regen. Dev-infra, no app change. function: `set_active_line` · ADR-0011
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

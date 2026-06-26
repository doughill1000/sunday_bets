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

- This is a shared file: top-of-file edits from two in-flight PRs can conflict.
  Resolve by **keeping both entries** (never take one side wholesale), consistent
  with the serialize-shared-files rule in `docs/WORKFLOW.md`.

> History before the first entry below lives in **GitHub Releases (v1.2–v1.7)** and
> the `ROADMAP.md` "Shipped" section; this log is not backfilled past that.

## 2026-06-26

- **#246** Migration drift guard — new `pnpm db:migration:verify` (`supabase/scripts/verify-src-reproduces-migrations.ts`) plus a non-blocking CI job (`.github/workflows/ci-migration-verify.yml`) that applies `supabase/src/**` from empty and diffs the resulting `public` schema against the full migration chain, normalizing away ACL / owner / `\restrict` / column-order noise (the local CLI's legacy table `GRANT ALL` differs from prod, so ACLs must be ignored). Closes the blind spot in `db:migration:check` (ledger-hash only) that let `src/` silently drift from prod. Informational until the deferred ADR-0012 history squash fixes the inline-policy→function apply ordering (the from-empty baseline currently fails on `is_member` not existing yet); promote to a required gate once green. Dev-infra, no app change. files: `verify-src-reproduces-migrations.ts`, `generate-migration.ts` (exports `SOURCE_ORDER`/`collectSources`) · ADR-0011 · ADR-0012
- **#245** set_active_line src↔prod reconcile — realigned `supabase/src/functions/odds/set_active_line.sql` to prod's deployed state on two axes: (1) **body** — restored prod's declare/begin version (game/spread validation + favorite-sign normalization + plain INSERT), replacing a stale src-only upsert/`ON CONFLICT` rewrite that was never a deployed migration; (2) **grant** — tightened the inline grant to `service_role` only, dropping a stale `authenticated` grant that a later blanket `revoke execute … from authenticated` (migration `20260625204117`) had already stripped from prod. The generated `reconcile_set_active_line` migration is a true no-op on prod (`create or replace` of the identical body; `service_role` already granted; `authenticated` already revoked) — it only re-syncs `src/` so a from-empty regen reproduces prod, and makes the pgTAP `tests/021` set_active_line negative control pass locally. Dev-infra, no app behavior change — set_active_line is invoked only via the service-role client (`src/lib/server/db/commands/setActiveLine.ts`). function: `set_active_line` · ADR-0011

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

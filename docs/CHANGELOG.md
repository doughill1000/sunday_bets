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

## 2026-06-25

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

# Changelog — shipped work

A terse, newest-first log of what has shipped to `master`, one entry per merged
issue/PR. It exists so an agent can answer **"is X already done?"** by reading this
file instead of reverse-engineering completion from source code.

**GitHub stays authoritative.** This is convenience *shipped history* (the same
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

## 2026-06-24

- **#185** ADR-0007: line-and-lock grading preset (House vs Gamer) — decision record,
  no runtime change. ADR-0007
- **#176** Manage sign-in methods — list, link, and unlink auth identities.
- **#174** Harden the `cleanup-worktrees` skill against Windows removal failures.
- **#173** Graceful empty/pending state for users with no active group membership.
- **#172** Refactor leaderboard weekly cards to a team-grouped picks layout.
- **#171** Add the `cleanup-worktrees` skill and script.
- **#170** Wire `active_group_id` resolution and retire the `DEFAULT_GROUP_ID` stopgap.

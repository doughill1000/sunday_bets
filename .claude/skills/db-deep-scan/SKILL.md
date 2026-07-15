---
name: db-deep-scan
description: Deep, read-only pre-release database integrity and security audit — recompute grading correctness independently, review every RLS policy and SECURITY DEFINER function individually, run a full (not sampled) referential sweep, project DB-size headroom, and check backup/auth posture. Use before a season launch or major release, when Doug asks for a "deep database scan" / "full DB audit", or to hand the same brief to another model (e.g. Fable) for an independent pass. Complements `season-ops` (cron/odds-quota/matview pipeline health) — this skill is data correctness and security, not pipeline health.
---

# Deep database scan

`season-ops` (readiness mode) and a plain `mcp__supabase__get_advisors` pass catch
pipeline health and linter-level findings. Neither catches a silently wrong grading
formula, an RLS policy that's technically present but too permissive, or a
SECURITY DEFINER function nobody's individually re-read since it shipped. This
skill is the deeper pass — expensive enough that it belongs before a launch or a
major release, not on every PR.

**Read-only, always.** `execute_sql` for `SELECT` only. Never `apply_migration` or
any other write/mutating tool. If a finding needs a fix, report it — don't fix it
inline; hand it to `issue-author` (and `start-issue` if Doug wants it implemented).

## Baseline first, don't re-derive it

Before going deep, get the cheap signal so the deep pass doesn't waste budget
re-finding what a linter already knows:

1. `season-ops` (readiness mode) for cron/secrets/schedule/odds-quota health.
2. `mcp__supabase__get_advisors` for `security` and `performance` lenses — treat
   its output as ground truth for "does an RLS policy exist", "is search_path
   mutable", "is this function SECURITY DEFINER and callable by `authenticated`".
   Don't re-derive this list by hand; consume it and go deeper on what it can't
   see (whether a policy that exists is _correct_, whether a callable function
   _should_ be callable).

Prod Supabase project ref: get it from `mcp__supabase__list_projects` or
`docs/agent-context/database.md` — don't hardcode a ref in this file since it can
change (e.g. project recreation). Cross-check against the QA/staging ref before
running anything, so a check never accidentally targets the wrong project.

## The deep checks

1. **Grading correctness, not just completeness.** Pick a sample of settled weeks
   across locked seasons (should be immutable) and the current unlocked season.
   Recompute win/loss/push independently from `games.final_scores` +
   `picks.locked_spread_value`/`locked_spread_team_id` (mirror the logic in
   `supabase/src/functions/grade/grade_pick.sql`) and diff against
   `pick_settlement.outcome`/`points_delta`. A mismatch here is the thing that
   would actually embarrass Doug in front of friends — rank it top of the report.

2. **RLS policy correctness, table by table**, not just "does a policy exist".
   Walk `public.*` policies against `auth.uid()`/group-membership semantics and
   ask: can a member of group A read or write group B's picks, settlements, or
   config? Can a non-member read a group's `settings`/`group_config`? Report any
   `USING`/`WITH CHECK` clause that looks too permissive or allows cross-group
   leakage.

3. **Every SECURITY DEFINER function, individually**, not just the ones already
   flagged by a prior pass. For each one callable by `authenticated`, read its
   body (`information_schema.routines` / `pg_proc`) and judge: does it validate
   the caller against `auth.uid()`/membership internally, or does it trust a
   caller-supplied parameter it shouldn't (the `audit_log_action(p_actor, ...)`
   pattern — an arbitrary actor id)? Recommend `REVOKE EXECUTE FROM authenticated`
   for anything that shouldn't be public RPC surface.

4. **Migration ledger vs. live schema drift.** Compare `supabase/src/**`
   (hand-authored source of truth) against the live schema
   (`list_tables --verbose` or catalog queries) for anything drifted — a column,
   index, or constraint present in one but not the other. Run
   `pnpm db:migration:check` and report pass/fail.

5. **Full referential/business-logic sweep, not a spot-check** — across every
   season: orphaned picks, `pick_settlement` rows with no matching `pick`, games
   with `final_scores` set but `status != 'final'` (or the reverse), duplicate
   picks per `(user, game, group)`, scoring weeks with zero games, and any
   `users.role = 'admin'` that looks unexpected.

6. **DB-size headroom vs. the Supabase Free tier cap** (~0.5 GB). Get actual
   current size (`pg_database_size`) and project forward using real per-season
   growth (games/picks/pick_settlement row counts × however many seasons ahead).
   Give an actual number and a rough timeline, not "keep an eye on it".

7. **Backup currency**, not just "a restore drill happened once". Pull the last
   several runs of the prod-backup GitHub Actions workflow
   (`gh run list --workflow=<backup workflow file> --limit 5`) and confirm it's
   actually succeeding on schedule, not just that a drill was proven on some past
   date.

8. **Auth config beyond the advisor's one flag** (leaked-password protection):
   MFA enforcement, session/JWT expiry, the redirect-URL allowlist (should be
   exactly the real prod domain + legitimate preview URLs, nothing wider), rate
   limits on signup/password-reset, whether email confirmation is required. This
   app is invite-only/private so the bar is lower than a public product — a wide
   redirect allowlist or no rate limiting is still worth flagging, just not
   panic-worthy.

## Reporting

Ranked punch list, most severe first: healthy / real problem / inconclusive
(needs a human judgment call). Concrete evidence only — actual counts, actual
query results, actual function or table names, not generic advice. If a finding
needs a human decision ("is this SECURITY DEFINER function intentionally
public?"), say so explicitly rather than guessing. Hand real bugs to
`issue-author`; don't fix them inline from this skill.

## Handing this to another model (e.g. Fable)

The steps above are self-contained enough to paste as a standalone prompt to a
different model/tool for an independent second pass — include the prod project
ref, the "already checked" baseline from step 0 so it doesn't waste its budget
re-deriving the advisor list, and the read-only ground rules verbatim.

## See also

- `season-ops` — the shallow/cheap pipeline-health pass this skill builds on.
- `db-pr-review` — reviewing one PR's diff, not a full audit.
- `docs/agent-context/database.md` — schema conventions and review checklist.
- `docs/adr/0024-*.md` (frozen/locked-season semantics) — relevant when a finding
  touches a locked season, since the normal grading pipeline no-ops there.

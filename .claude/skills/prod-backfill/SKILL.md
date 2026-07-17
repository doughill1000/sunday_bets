---
name: prod-backfill
description: Runbook for a one-off production data write (backfill, repopulation, targeted fix) via the Supabase MCP — announce the exact write and target project ref, wait for explicit go-ahead, capture baseline counts, execute, verify, record. Use when a write needs to go directly against prod data outside the normal migration pipeline, e.g. "backfill the ratings table", "repopulate X in prod", "fix these rows in production". Not for schema changes (`db-migration`) or read-only audits (`season-ops`, `db-deep-scan`) — those hand off here when they find a problem that needs a prod write.
---

# Prod backfill runbook

A one-off prod data write (backfill, repopulation, targeted row fix) is not a
migration — it's a manual `execute_sql`/`apply_migration`-adjacent write run once,
by hand, against live data. Two prior instances (the badge-taxonomy backfill,
2026-07-14; the credibility-ratings populate, 2026-07-13) each re-derived the same
safety steps from scratch in-conversation, because the rule ("always flag and get
explicit go-ahead before prod writes") lived only in agent memory, not the repo.
This skill is that written runbook so any session — Claude or Codex, fresh or
not — inherits it.

**This is not a schema change.** If the write requires adding/altering a column,
table, or constraint, that's `db-migration` + the release pipeline (ADR-0010), not
this skill. This skill is for writes to existing columns/tables — backfilling
values, repopulating a table from a recomputed source, fixing specific rows.

## The six steps

1. **Announce.** State, in the conversation, the exact SQL or write operation
   and the **target project ref** (prod vs staging — see below). Show the actual
   query, not a paraphrase. Do this before touching anything.
2. **Explicit go-ahead.** Wait for the human to say yes to that specific
   announcement. A prior approval for a different write, or a general "go ahead
   with the backfill" from earlier in the conversation, does not cover a query
   whose shape has changed since — re-announce and re-confirm if the SQL changes.
3. **Baseline.** Capture row counts (or the specific values being overwritten)
   for the affected table(s) before the write, via `mcp__supabase__execute_sql`
   (read-only). Note the most recent backup run so there's a known-good restore
   point if the write goes wrong — see `db-deep-scan` step 7 for how to check
   backup currency.
4. **Execute** against the confirmed project ref only — never against a ref other
   than the one stated in the announcement.
5. **Verify.** Re-run counts/spot-checks after the write and diff against the
   baseline; confirm the delta matches what was announced (right number of rows
   changed, no unintended side effects).
6. **Record.** Note what ran and where — an issue comment or the PR description
   if the backfill is tied to one — so it's discoverable later without re-deriving
   from conversation history.

## Prod vs staging project refs

Get the current refs from `mcp__supabase__list_projects` or
`docs/agent-context/database.md` — don't hardcode a ref in this file, since a
project can be recreated. State which ref the announcement targets explicitly
("prod, ref `xxxx`" or "staging, ref `yyyy`"); never assume prod is the default.

## Remember

- **The human confirmation gate is the point.** Never automate step 2 — no
  "I'll proceed unless you object," no batching multiple distinct writes under
  one announcement.
- If the "backfill" turns out to need a schema change partway through, stop and
  route to `db-migration` instead of improvising a write outside the migration
  ledger.
- This skill doesn't apply to routine seed/reset scripts already covered by
  existing tooling (`db:seed:demo`, `db:reset:local`) — those aren't one-off prod
  writes.

## See also

- `season-ops`, `db-deep-scan` — read-only checks that find problems; when a
  finding needs a prod write to fix, come here.
- `db-migration` — schema changes, which this skill explicitly excludes.
- `docs/adr/0010-*.md` — the prod-gating posture this runbook implements.
- `docs/agent-context/database.md` — schema conventions, project ref lookup.

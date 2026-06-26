# ADR-0012: Migration history rebaseline (squash) and simplified rollout

- Status: Accepted
- Date: 2026-06-26
- Issue: None (approved migration-rebaseline plan; no tracking issue)
- Supersedes: ADR-0011 (Decision §8 and the incremental-apply CI gate only; the
  closed-by-default design in §1–7 is retained)

## Context

The migration history under `supabase/migrations/` has grown to **62 files / ~8.3k
lines** since `20250905211021_init.sql`. It carries structural debt the generator
cannot shed incrementally:

- Three legacy multi-object sources are frozen byte-for-byte by
  `LEGACY_MULTI_OBJECT_SOURCES` (`schemas/0100_enums.sql`, `schemas/0200_tables.sql`,
  `functions/auth/handle_new_auth_user.sql`). Co-locating a core-table grant in its
  object's file is impossible while the freeze holds.
- `zz_group_grants.sql` / `zz_picks_fanout_grants.sql` encode load order in their
  filenames purely to survive a blanket revoke (ADR-0011 root causes #1–#2).
- Whole-file re-emit makes every grant edit a large diff and a merge-conflict magnet.

**The decision driver is the rollout, not just the clutter.** ADR-0011's most
expensive machinery — Decision §8's _additive-first/subtractive-second_ dance and the
_incremental-apply CI gate_ (a new harness that applies only the newest migration onto
a prod-equivalent N-1 baseline) — exists for exactly one reason: to transform a **live
prod schema in place** from open to closed without a window where `authenticated`
loses access. **No one is currently using the app** (offseason; season opens
September). That removes the live-upgrade constraint those mechanisms were built to
satisfy, and makes this the right moment to also collapse the history and lift the
frozen-blob / `zz_` debt.

Two facts make the squash cheap and safe:

- The generator already supports it. `generate-migration.ts --bootstrap` re-hashes the
  entire `supabase/src/**` tree and rewrites the ledger with **no migration emitted**;
  an empty ledger makes a from-empty regeneration emit the whole tree as one baseline.
  Regenerating from an empty ledger also lifts both the `LEGACY_MULTI_OBJECT_SOURCES`
  freeze and the stale-key guard, so files can finally be reorganized.
- Supabase migrations are **forward-only** — there are no down-migrations. "Rollback"
  never meant replaying backward; it only meant redeploying an older app version
  against the live DB, which we are no longer doing.

This is hard-to-reverse infrastructure (it rewrites the migration ledger and reconciles
prod's `schema_migrations` bookkeeping), so an ADR is required.

## Decision

Rebaseline the migration history to a **single clean baseline**, **leaving prod's
physical schema and data untouched**, and simplify the closed-by-default rollout
accordingly.

1. **"Prod untouched" is about state, not grants.** The squash collapses migration
   _history_, not schema _state_. The closed-by-default ACL change (revoke PUBLIC,
   revoke `anon` table/enum defaults, add the explicit `authenticated`/`service_role`
   grants) is a real mutation that must still execute against prod exactly once. These
   are two independent deliverables and their ordering relative to prod is the safety
   model.

2. **Two phases, security-fix-first (Sequence Y).**
   - **PR1 — closed-by-default security migration.** Ship ADR-0011's §1–7 design as a
     single, minimal incremental migration on the **existing** 62-file history: the
     `0001_role_baseline.sql` anchor, the three closure grants (already authored),
     plus the authz regression matrix. It rides the proven incremental path that CI
     already applies to prod. With no users, it needs **no additive/subtractive split
     and no incremental-apply CI gate** — one migration, reviewed as the security
     boundary change. PR1 does **not** reorganize `zz_*` or `0200_tables.sql`; that
     churn is deferred to the squash where it is free.
   - **PR2 — history squash.** Once PR1 is in prod, `src == prod == closed`. Reset the
     ledger to empty, delete the old migration files, and regenerate **one** baseline
     from final `src`. The squash is where the free cleanup lands: un-freeze
     `schemas/0200_tables.sql` (drop it from `LEGACY_MULTI_OBJECT_SOURCES`; co-locate
     or slim table grants), delete the `zz_*` files, and establish clean co-located
     grants. The new baseline carries **no ACL change** (prod is already closed), so it
     reproduces prod exactly.

3. **Why Y over squash-first (Sequence X).** The security fix is the part that must be
   correct and must reach prod; shipping it on the proven incremental path is lower
   risk than first performing a novel squash + `repair` and then shipping the fix on a
   freshly rebaselined tree. Y also reconciles prod against an **exact match** (post-PR1
   closed prod vs closed baseline) and reuses the in-flight grant work directly.
   Between PR1 and PR2 the repo is in a fully valid state, so the squash is unhurried.

4. **Prod reconciliation (the one sharp edge).** After the squash, prod already
   contains every object the baseline would create, so the baseline must **not** be
   re-run against prod (its `create table` statements are not idempotent). Reconcile
   prod's `supabase_migrations.schema_migrations` so the old versions are marked
   reverted and the single baseline version is marked **applied** without execution
   (`supabase migration repair`). A mistake here makes a deploy re-run baseline DDL
   against prod — so it is gated behind an explicit confirmation and the precondition
   below.

5. **Precondition gate for the squash (non-deferrable).** Before regenerating, prove
   the 62-migration history reproduces prod **exactly**: diff a fresh local schema
   built from the current migrations against a prod schema dump. If they diverge, the
   baseline is wrong and the squash is blocked until reconciled.

6. **No data re-import.** Tearing down and reloading prod data (NFL 2022–24 history and
   all rows) buys no schema benefit over the squash and adds restore-correctness risk.
   Rejected.

7. **Retained from ADR-0011.** The closed-by-default design (§1–7): the
   `0001_role_baseline.sql` anchor, co-located object grants, revoke-from-`PUBLIC`/`anon`
   (never blanket-revoke `authenticated`), the explicit-grant closure for every
   function reachable in an `authenticated` context, the phase-ordering guardrail, and
   the **authz regression matrix**. The matrix now guards on the `db:reset`/build path
   only; the incremental-apply gate is dropped because there is no live in-place
   upgrade to protect.

## Consequences

**Helpful.**

- One clean baseline replaces 62 files / 8.3k lines; future diffs shrink to the object
  touched.
- The frozen `0200_tables.sql` blob and the `zz_*` ordering hacks are finally
  removable — the structural debt ADR-0011 had to work _around_ is deleted, not
  managed.
- The rollout loses its most fragile machinery: no additive/subtractive choreography,
  no new incremental-vs-reset CI harness.
- Security and cleanup stay independently reviewable and independently revertible (two
  PRs).

**Harmful / cost.**

- One irreversible-ish prod bookkeeping operation (`migration repair`); gated by the
  exact-match precondition and explicit confirmation.
- Loses the ability to replay prod from an arbitrary historical migration — accepted
  (forward-only; no version rollback planned).
- Two-phase coordination: PR2's reconciliation is only valid once PR1 is actually in
  prod.
- The squash touches the shared ledger, so it is a **single serialized migration** that
  blocks concurrent DB-migration work (AGENTS.md), like any ledger change.

## Alternatives considered

- **Teardown + re-import** (dump prod, drop, rebuild from clean schema, reload).
  Rejected: same schema result as the squash but moves all real data for no benefit and
  adds restore-correctness risk.
- **Keep the 62-file history; finish ADR-0011 §8 as written** (additive/subtractive +
  build the incremental-apply CI gate). Rejected: carries the frozen-blob and `zz_`
  debt forward and builds a CI harness whose only purpose is protecting a live upgrade
  that, in this window, does not exist.
- **Squash first, then change grants (Sequence X).** Rejected vs Y: it would require
  hand-authoring an "open-grant" baseline to reconcile against current prod, then a
  second migration to close it; Y ships the security fix on the proven path and
  reconciles against an exact post-fix match instead.

## Follow-up

- GitHub issue (via `issue-author`) tracking PR1 (closed-by-default security migration)
  and PR2 (history squash + prod reconciliation), flagged as serialized DB work.
- Prod reconciliation runbook (exact `migration repair` commands, verified against the
  `#238`/`#239` deploy gating) authored in PR2 and run only with explicit confirmation.
  **Done (2026-06-26):** the §4 reconciliation — `migration repair`, the two orphan-function
  drops, and the `authenticated` table-grant tightening — ran against prod **and** staging
  under explicit confirmation; as-run record at
  `docs/runbooks/adr-0012-prod-reconciliation.md`.
- src==prod precondition check recorded on the issue before the squash.
- pgTAP offline-bootstrap hardening (ADR-0011 follow-up). **Done (2026-06-26):** the
  basejump `supabase_test_helpers` v0.0.6 helpers are vendored into
  `supabase/tests/000_setup.sql`, dropping the per-run `api.database.dev` fetch
  (`http`/`pg_tle`/dbdev).
- The `db:migration:verify` drift guard is promoted to a required gate now that the
  squashed `src/**` reproduces the single baseline from empty: `continue-on-error` is
  removed from `.github/workflows/ci-migration-verify.yml`.
- **Status set to `Accepted` (2026-06-26):** PR1 is in prod (the §4 reconciliation
  record at `docs/runbooks/adr-0012-prod-reconciliation.md`), the squash baseline is the
  committed history, and the from-empty drift guard is green and now blocking.

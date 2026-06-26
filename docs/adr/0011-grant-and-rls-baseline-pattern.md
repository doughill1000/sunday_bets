# ADR-0011: Closed-by-default grant/RLS baseline pattern

- Status: Proposed
- Date: 2026-06-26
- Issue: # (pending — "Refactor grant/revoke pattern: closed-by-default baseline")
- Supersedes: None
- Note: Decision §8 (the additive-first/subtractive-second rollout and the
  incremental-apply CI gate) is narrowed by [ADR-0012](0012-migration-history-rebaseline.md),
  which rebaselines the migration history during the no-users window. The
  closed-by-default design in §1–7 is unchanged.

## Context

The Supabase permission layer (`grant`/`revoke`/RLS under `supabase/src/`) has
accreted debt that produces recurring grant drift, migration churn, merge conflicts,
and pgTAP fragility. The migration generator
(`supabase/scripts/generate-migration.ts`) hashes **whole files**, re-emits the
entire file on any change, and concatenates sources in a fixed phase order:
`schemas → indexes → views → functions → policies → triggers → grants → comments`.
The current grant design fights both facts:

1. **Blanket revoke runs in the wrong phase.** `grants/player_grants.sql` does
   `revoke execute on all functions in schema public from authenticated`. The
   `grants` phase runs _after_ the `functions` phase, so this wipes every
   per-function `grant execute … to authenticated` the function files already
   declared — forcing those grants to be re-stated inside the grant file.
2. **`zz_group_grants.sql` / `zz_picks_fanout_grants.sql` are ordering hacks.** The
   `zz_` prefix exists only to sort the file _after_ `player_grants.sql` so its
   grants survive the blanket revoke. A filename encoding load order is a smell.
3. **Whole-file re-emit churn.** One-line grant edits re-emit the whole file,
   producing repeated full re-emits of the same file; two branches editing these
   monolithic files merge-conflict and silently drift the ACL state.
4. **Split source of truth.** Function execute lives in three places (the function
   file plus two grant files); table grants are split across grant files.
5. **Local-vs-prod divergence.** A full `db:reset` re-grants after the blanket
   revoke, so it self-heals. An incremental migration that re-emits
   `player_grants.sql` _alone_ strips functions and leaves them stripped in **prod**
   until the next reset — green locally, broken in production.

**Motivating incident (PR #239 / issue #214).** A `SECURITY INVOKER` fan-out RPC
needed a helper grant. Adding grants to `player_grants.sql` re-emitted that file and
its blanket `revoke execute … from authenticated` **silently stripped seven
commissioner RPCs**. It surfaced only because pgTAP 016–019 happened to exercise
them; without that coverage it ships to prod silently. The fix at the time added
_another_ `zz_` ordering hack. Those three symptoms are root causes #1, #2, and #5.
As of `bbfd7a1` the #239 artifacts (`zz_picks_fanout_grants.sql`,
`lock_pick_all_groups`, `unlock_pick_all_groups`, the `del_picks_own_pre` policy, the
`delete on picks` grant) are on `master`, so the sequencing dependency is gone and
this refactor is unblocked; those artifacts must be folded into the migration so the
cleanup does not re-strip them.

### Generator constraints that bound the solution

- `schemas/0200_tables.sql` is a legacy multi-object source
  (`LEGACY_MULTI_OBJECT_SOURCES` + the `validateObjectLayout` single-primary-object
  guard). Editing it to co-locate a table grant **throws**. Core-table grants
  therefore cannot live in their object's file.
- Files under `supabase/src/` must never be renamed/moved/deleted (the generator
  treats that as drop+create and throws on stale ledger keys). Existing grant files
  are repurposed by rewriting contents, never deleted.

### Empirical baseline (verified on the local stack, 2026-06-26)

This is the highest-risk input and a hard prerequisite — recorded here per the
blocking gate. Verified by inspecting `pg_default_acl`, object ACLs, and the ACL a
brand-new object receives (created and rolled back in a transaction):

| Question                              | Verified answer                                                                                                                                             |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Object-owner role in `public`         | **`postgres`** — all 33 functions, 22 tables, 6 enums; migration `current_user` = `postgres`. The `supabase_admin`-ownership footgun does not apply.        |
| Function-execute over-grant holder    | **`PUBLIC`** — a new function gets `{=X, postgres=X, service_role=X}`; `=X` is PUBLIC's built-in execute, still live (Supabase only _adds_ `service_role`). |
| Table over-grant to `anon`            | **`anon=Dxtm`** by default (TRUNCATE/REFERENCES/TRIGGER/MAINTAIN — includes TRUNCATE). No default `select/insert/update/delete` to `anon`/`authenticated`.  |
| Enum/type over-grant holder           | **`PUBLIC` USAGE** — built-in default (new enum acl is NULL). No `pg_default_acl` type row; there is **no `REVOKE … ON ALL TYPES IN SCHEMA`** syntax.       |
| Functions relying on NULL/default acl | **0 of 33** — all carry materialized ACLs, but many carry a materialized `=X` (PUBLIC) the one-time revoke will strip.                                      |

Consequences of these facts for the design:

- The default-privilege qualifier is **`for role postgres`** (equal to the ambient
  migration role, so self-documenting rather than behavior-changing). Prod runs the
  same standard Supabase model; the one-time reconcile revokes are owner-agnostic and
  cover existing objects regardless.
- `unlock_pick` is **`SECURITY DEFINER`**, not an authenticated-callable INVOKER. The
  authenticated-callable INVOKER entry points are `lock_pick`, `lock_pick_all_groups`,
  and `unlock_pick_all_groups`. Only INVOKER frames check callee execute against the
  _caller_, so the at-risk set is what those entry points reach as `authenticated`.
- The verified must-grant-to-`authenticated` set (empirical call-graph **and**
  RLS-policy audit) is **three** functions, each currently reaching `authenticated`
  only through PUBLIC=X: `_get_final_week_unlimited_allin` (DEFINER, called by
  `lock_pick` / `lock_pick_all_groups`), `game_has_started` (INVOKER, called by
  `unlock_pick_all_groups` **and** referenced by the core `picks` / `comments` /
  `reactions` RLS policies), and `is_admin` (INVOKER, referenced by `authenticated` RLS
  policies on `settings` / `audit_log` / `cron_run_log`). The PUBLIC revoke breaks each
  unless it gains an explicit `grant execute … to authenticated`. `is_admin` is
  reachable **only** through policies — a function-call-graph-only audit misses it,
  which is why the completeness audit must also scan RLS / CHECK / default /
  INVOKER-view expressions, not just function bodies.

This is a security-boundary + cross-cutting-pattern change, so an ADR is required.

## Decision

Adopt a **closed-by-default baseline** plus **co-located object grants**, with
core-table grants centralized only where the legacy guard forces it.

1. **Anchor — a closed-by-default role baseline.** A new schemas-phase file
   (`supabase/src/schemas/0001_role_baseline.sql`, lowest number so it sorts first)
   that, qualified `for role postgres in schema public`:
   - `grant usage on schema public to anon, authenticated, service_role;`
   - `alter default privileges … revoke execute on functions from public;`
   - `alter default privileges … revoke all on tables from anon, authenticated;`
     (per-object `authenticated` grants are re-stated explicitly elsewhere)
   - `alter default privileges … revoke usage on types from public;`
   - One-time reconcile for existing objects:
     `revoke execute on all functions in schema public from public;`,
     `revoke all on all tables in schema public from anon;`, and a per-enum
     `revoke usage on type … from public;` for each existing enum (no `ALL TYPES`
     blanket exists).
   - `service_role` defaults stay open and remain owned by `admin_grants.sql`.

   This single file removes the need for any later blanket revoke.

2. **Functions and views co-locate their grants.** Each function/view file owns its
   `grant execute`/`grant select`. With the baseline closing the default door these
   grants are the sole source of truth and survive because nothing re-revokes them —
   no re-statement, no `zz_` ordering dependency. The redundant per-file
   `revoke … from public, anon` lines are removed.

3. **Core-table grants stay in slim, single-domain `grants/` files** (forced by the
   `0200_tables.sql` legacy guard), with the blanket revoke removed and the files
   split so a one-table change re-emits a small file. `zz_*` files are reduced to a
   header/no-op (they cannot be deleted without hand-editing the ledger).

4. **Revoke from `PUBLIC`/`anon`, never blanket-revoke from `authenticated`** after
   per-object grants. This is the rule whose violation is the entire bug class.

5. **Every function executed in an `authenticated` context carries an explicit
   `authenticated` execute grant.** That context is broader than function call chains:
   it is the transitive closure of helpers reachable from authenticated-callable
   INVOKER entry points **plus** every function referenced by an RLS policy, CHECK
   constraint, column default, or INVOKER view that runs as `authenticated`. The PUBLIC
   revoke removes the current PUBLIC=X path for all of them. The closure is computed
   empirically before generating the migration (verified set: three functions — see
   Context).

6. **A pgTAP authz regression matrix guards the contract**, derived from a
   function-centric inventory (not a hand-picked subset) so every function — including
   PUBLIC-default-reliant helpers with no grant line — is covered. It must assert anon
   denial, the intended `authenticated` table/RPC grants, helper executability for the
   INVOKER closure, and full `service_role` access; and it must fail against the old
   pattern's known gaps.

7. **Phase-ordering guardrail.** The one-time reconcile revokes stay in the
   schemas-phase baseline (a no-op on a fresh build, effective on a prod incremental
   apply). A loud comment forbids moving them to the grants phase — doing so recreates
   the exact wrong-phase blanket revoke this ADR exists to kill.

8. **Two bars gate the implementation PR (non-deferrable).** First, the **transitive
   helper closure (Workstream F) must be exhaustive**, and the authz matrix must derive
   from that same function inventory — an incomplete closure is a silent prod break,
   not a cosmetic gap. Second, the matrix must run on the **incremental-apply path** (a
   pre-refactor, prod-equivalent DB with only the new migration applied on top), not
   only a clean `db:reset` — that path is the sole automatic catch for the silent-strip
   class this ADR targets. A manual incremental run is acceptable for the first PR;
   only the _full CI automation_ of that gate may be a fast-follow. Recommended
   structure to shrink the dangerous step: sequence the work **additive-first,
   subtractive-second** — land every explicit `authenticated` grant and get the matrix
   green while PUBLIC execute is still present, then remove PUBLIC in a second step so
   any breakage is isolated to the removal.

The boundary this draws: closed-by-default for `anon`/`authenticated`/`PUBLIC`;
exactly one place that closes the door (the baseline); exactly one place per object
for its grant (its own file, or a slim table-grant file for legacy-guarded tables);
`service_role` centralized; no blanket re-revoke and no load-order filename hacks.

## Consequences

**Helpful.**

- One obvious place closes the schema; one obvious place per object grants it. No
  re-statement, no `zz_` hacks, minimal per-change re-emit blast radius.
- A real security tightening, not just cleanup: today `anon`/`PUBLIC` can _call_ RPCs
  and cast enums via Postgres's default PUBLIC grants — stopped only by each
  function's `auth.uid()` guard, not at the grant layer. The baseline closes that at
  the grant layer (defense in depth) and removes anon's odd default `Dxtm` (incl.
  TRUNCATE) on new tables.
- Drift cannot return silently: the authz matrix encodes the contract and fails on
  regressions.

**Harmful / cost.**

- One-time large re-emit (many function files touched to co-locate grants). Intended
  and bounded; afterward per-object changes re-emit only their own small file.
- INVOKER helper-grant completeness is a genuine footgun: missing one helper in the
  closure strips execute silently. Mitigated by the function-centric audit feeding the
  matrix, but it is the top execution risk.
- Prod-vs-local parity: `alter default privileges` affects only future objects, and a
  clean `db:reset` always looks healthy. Catching the incremental-apply regression
  class needs an incremental-vs-reset gate (new CI harness work; `db:reset:local`
  cannot express "apply only the newest migration onto an N-1 baseline"). The manual
  incremental-apply matrix run is **in-scope for the implementation PR** — it is the
  only automatic catch for the silent-strip class; only the full CI automation of that
  gate may be a fast-follow.
- Enum lockdown must enumerate each existing type (no `ALL TYPES` blanket).
- The change touches shared grants/RLS, so it is a **single serialized migration**
  that blocks concurrent DB-migration work (AGENTS.md).

## Alternatives considered

- **Pure co-location for every object, including tables.** Rejected: editing
  `0200_tables.sql` to add a table grant trips the multi-object guard and throws.
  Core-table grants must stay centralized.
- **Keep the blanket revoke + `zz_` ordering (status quo).** Rejected: it is the
  direct cause of the #239 silent strip and the recurring drift/churn.
- **Revoke from `authenticated` then re-grant in the same phase.** Rejected: that _is_
  the wrong-phase bug; per-object grants declared in the functions phase are wiped by
  a later grants-phase revoke.
- **Per-function `revoke … from public` in every function file.** Rejected:
  redundant once the default is closed, and it re-introduces churn across every file.
- **Leave PUBLIC execute and rely on `auth.uid()` guards alone.** Rejected: the trust
  boundary belongs at the grant layer; guards are the second layer, not the only one.

## Follow-up

- GitHub issue (via `issue-author`) with workstreams A–F (baseline, kill blanket
  revoke, co-locate function grants, pgTAP offline bootstrap, authz matrix,
  migration-completeness audit) as acceptance criteria; flagged as serialized DB work.
- pgTAP offline-bootstrap hardening (vendor basejump `0.0.6` helpers, drop the
  `api.database.dev` fetch) — separable, lands as its own commit/PR under the issue.
- Incremental-apply matrix run is **in-scope for the implementation PR** (manual
  acceptable); only the full CI automation of the incremental-vs-reset gate may be a
  fast-follow under the same epic.
- Re-confirm prod object ownership is `postgres` before applying (or rely on the
  owner-agnostic one-time reconcile); record any divergence here.
- Set status to `Accepted` once the empirical baseline and the workstream design are
  approved.

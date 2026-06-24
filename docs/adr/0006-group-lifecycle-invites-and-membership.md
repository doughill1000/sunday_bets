# ADR-0006: Group lifecycle — creation gating, invites, and membership management

- Status: Accepted
- Date: 2026-06-24
- Issue: #146
- Supersedes: None

## Context

v2.0 opens the single-group → multi-group boundary that `ADR-0002` established the data
model for. The tenancy schema (`groups`, `group_memberships`, `group_id` on group-owned
records) already exists and has been proven invisibly against the original group; v1.8 wires
the group-aware shell (#128 `active_group_id` resolution, #129 empty/pending state). What
remains for self-service is **UI and access** — and the access rules are a trust-boundary
decision, not an implementation detail.

The chosen growth model is **hybrid**: joining a group via an invite is open to everyone,
while *creating* a group is gated behind a toggle that can later flip fully open. This
introduces two things `ADR-0002` does not cover — a new **invite-redemption trust type**, and
a new **commissioner write tier** above plain membership — plus the create-gate mechanism. Per
`docs/adr/README.md` (a change to authorization/RLS/trust boundary, and a constraint that
affects many future features), this requires an ADR before the v2.0 implementation issues
(#147–#151) are built.

The decision drivers are:

1. **Security** — token replay/abuse, account-takeover via redemption, and RLS correctness on
   a new table and a new write tier.
2. **Operational reversibility** — the create-gate must flip from gated to open *without a
   migration*, so the model can open up on a business decision rather than an engineering one.
3. **Fairness** — a commissioner's authority must be bounded and distinct from the global admin
   role (`public.users.role`), which stays orthogonal.
4. **Simplicity** — the smallest safe surface for a friends-scale app; abuse controls are
   deferrable while creation stays gated.

## Decision

### 1. Hybrid growth: open join, gated create

Joining an existing group is open to anyone who holds a valid invite. Creating a *new* group is
gated. This lets the product grow member-driven first, then open up deliberately, without
rebuilding either path.

### 2. One unified, expiring, revocable invite row

Invites are a single `group_invites` row type carrying `expires_at` and a configurable
`max_uses` (plus `used_count` and a `revoked_at`). `max_uses = 1` expresses a single-use token
link; a larger or unbounded `max_uses` expresses a shareable group code. One mechanism covers
both shapes, so a second invite system never has to be added later. Invites reference the group,
never an exposed user ID.

### 3. Create-group gate: capability + global mode toggle, flippable without migration

Group creation is gated by **two** controls: a per-user `can_create_group` capability and a
global `group_creation_mode` setting (`gated` | `open`). In `gated` mode only capable users may
create; flipping the setting to `open` lets any authenticated user create — a configuration
change, not a schema migration. Operational settings stay on the existing global single-row
settings object per `ADR-0002`.

### 4. Commissioner authorization is an RLS-enforced membership role

Commissioner powers (rename the group, remove a member, promote a member, manage the group's
invites) are authorized by **RLS keyed on `group_memberships.role = 'commissioner'`**, not by
application-layer checks alone — app-only checks are bypassable through the Data API. This
extends, and stays consistent with, the membership-is-the-RLS-boundary rule from `ADR-0002`.

### 5. Multiple commissioners; the last-commissioner guard is transfer-required

A group may have more than one commissioner. The last-commissioner guard is **transfer-required**:
a commissioner cannot be removed, demoted, or leave while they are the *only* commissioner —
another member must be promoted first. Block-only (refusing the action with no promotion path)
was rejected because it strands a sole commissioner who wants to leave, with no exit.

### 6. Redemption is a `SECURITY DEFINER` RPC, never a direct client insert

A new `group_memberships` row is created only by a `SECURITY DEFINER redeem_invite(code)` RPC
that validates existence, expiry, revocation, and `max_uses` before inserting and incrementing
`used_count` atomically. There is no client-writable insert path into `group_memberships` via
an invite. This keeps the trust check server-side and the operation auditable and replay-safe.

### 7. Global admin is unchanged and orthogonal

`public.users.role = 'admin'` and `public.is_admin()` are untouched. Commissioner authority is
scoped to a single group through membership; global admin is cross-cutting and operational. The
two tiers do not collapse into one another.

## Consequences

**Helpful:**

- Self-service ships as UI and access on the proven `ADR-0002` schema, with **no retrofit**.
- "Flip to open" becomes a configuration change, so the growth decision is reversible and not
  gated on engineering.
- One invite mechanism serves both single-use links and shareable codes, so providers/shapes can
  change later without a second system.
- The admin/RLS boundary from `ADR-0002` is preserved; commissioner is a strictly additive,
  group-scoped tier.

**Costs:**

- A new persistent table (`group_invites`) and a new RLS write tier must be tested thoroughly —
  the security value is entirely in the policies and the redemption RPC being correct.
- Abuse controls (rate limiting, bot protection, create caps) are deliberately **not** built now;
  they are required only when creation flips to open, and are tracked as the parked v2.2 issue.
- Duplicate-account edge cases (a user joining under a different identity) are out of scope here
  and remain governed by the OAuth identity model in `ADR-0004`.
- Every group-owned query the new flows add must still lead with a `group_id` index; RLS is not a
  query-performance strategy.

## Alternatives considered

- **Single-use-only token links** *or* **reusable-code-only** as the invite primitive. Rejected:
  each forces a second mechanism later; the unified `expires_at` + `max_uses` row expresses both.
- **App-layer commissioner checks** instead of RLS. Rejected: bypassable through the Data API;
  the durable boundary must be in the database, consistent with `ADR-0002`.
- **Block-only last-commissioner guard** (no transfer). Rejected: strands a sole commissioner who
  wants to leave.
- **Open public creation from day one** with abuse controls. Rejected for launch: larger surface
  (rate limiting, bot detection, caps) for a friends-scale app; the gate + flippable toggle lets
  this be turned on deliberately later (parked v2.2) once it is worth the operational weight.
- **Self-serve account merge as part of group joining.** Out of scope; governed by `ADR-0004`
  (deferred behind a sizing spike).

## Follow-up

Implementation is phased into separate Ready issues (one branch/worktree/PR each), gated on this
ADR being Accepted:

- **#147 — Invite tokens (schema + RLS + `redeem_invite` RPC).** Realizes decisions 2 and 6.
- **#148 — Create-group flow (gated).** Realizes decision 3.
- **#149 — Join via invite (`/join/[code]`).** Consumes #147; relates to #129 and #141.
- **#150 — Group switcher.** Governed by `ADR-0002`/#128 rather than this ADR.
- **#151 — Members list + commissioner basics.** Realizes decisions 4 and 5 (rename, remove,
  promote, leave, last-commissioner guard, invite-mint UI).
- **Parked #156 — Flip group-creation to open + abuse controls.** Completes decision 3's "flip to
  open"; depends on the OAuth track (#134).

The DB issues (#147, #148, #151) serialize the migration ledger, the generated
`src/lib/types/supabase.ts`, and grant/RLS edits against each other and against in-flight v1.8 DB
work per `docs/WORKFLOW.md`. Revisit this decision if creation opens to the public (promote #156
and its abuse controls) or if the commissioner authority surface needs to widen.

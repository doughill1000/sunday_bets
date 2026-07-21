# ADR-0021: Caller-scoped `SECURITY DEFINER` standings RPC for non-web clients

- Status: Rejected (2026-07-21) — see "Rejection" below
- Date: 2026-07-06
- Issue: None — approved plan (parks the mobile-app graduation path; the driving
  experiment is PR #394, "Expo companion app")
- Supersedes: None

## Rejection (2026-07-21)

Rejected under this ADR's own Follow-up clause: "If the mobile experiment is abandoned,
mark this ADR `Rejected` rather than leaving it `Proposed` indefinitely." PR #394 was
**closed without merging on 2026-07-11**; `mobile/` never landed on `master`, and the
standings RPC this ADR describes was never built (no `SECURITY DEFINER` matview-reader
exists in `supabase/src/functions/`).

Nothing here is retracted as _wrong_ — the analysis of why matviews cannot carry RLS, and
why a caller-scoped `SECURITY DEFINER` RPC is the right shape for a non-web client, stands
and is the reason to reread this file if a second client ever appears. It is rejected only
in the sense that the decision was never adopted and has no implementation pending. The
service-role standings path (ADR-0013 §3) remains the only reader.

**Revisit if** a native/offline client is greenlit again, or a future client genuinely
needs client-side standings computation — the one case this decision forecloses.

## Context

PR #394 is an experimental Expo / React Native companion app that talks **directly to
Supabase under the existing RLS** — there is no mobile backend. It authenticates as the
`authenticated` role (anon key + the user's JWT), so every read it makes is bounded by
the ADR-0002 membership RLS policies. That works for picks, groups, and the other
base-table reads.

Standings are the exception. Per ADR-0013 the leaderboard/stats aggregations are served
from **materialized views**, and Postgres matviews cannot carry RLS. ADR-0013 §3 keeps
those reads **service-role only**: the web app reaches them through the SSR service-role
client with an explicit `group_id` filter, and cross-group isolation is enforced by that
filter (pgTAP-covered), not by RLS. A direct-to-Supabase client has no service role and
therefore **cannot read the matviews at all**.

PR #394's stopgap is to **re-implement the leaderboard aggregation in TypeScript**
(`mobile/src/domain/leaderboard.ts`) over the base rows the client _can_ read under RLS,
mirroring the matview SQL — including drop-worst-week (ADR-0018). This is a **drift
risk, not a security risk**: RLS still bounds what the client can see, but the scoring
logic now exists in two languages. Any change to scoring or drop-worst-week semantics
must be made in both the SQL matview and the TS mirror, or web and mobile standings
silently diverge.

A decision is needed on how a backendless client reads standings **before the mobile app
graduates from experiment to a supported client** — not to unblock the experiment, which
can stay parked as-is.

## Decision

Before the mobile app (or any future non-web client) is offered to users, standings will
be served by a single **`SECURITY DEFINER`, caller-scoped RPC** that returns matview rows
for the caller's groups — **not** by re-implementing aggregation in each client.

The RPC (owned by `postgres`, `SECURITY DEFINER`, `stable`, read-only) reads the existing
leaderboard/stats matviews and filters them to the caller's memberships, derived from
`auth.uid()` → `group_memberships`. It becomes the single source of standings truth for
non-web clients; the web app may later migrate onto it or keep its service-role path — but
there is exactly **one** scoring implementation, the SQL matview.

Boundaries future work must preserve:

1. **Scoring logic lives only in SQL (the matviews).** No client re-implements
   aggregation or drop-worst-week. The RPC is a caller-scoped _read_ of the matview, not a
   recomputation. The client-side mirror in PR #394 is a temporary experiment artifact and
   must be deleted when the RPC lands.
2. **The membership filter is the trust boundary.** Because `SECURITY DEFINER` bypasses
   RLS, the `group_memberships` filter inside the function _is_ the ADR-0002 cross-group
   boundary. It must return only groups the caller belongs to and must carry pgTAP
   cross-group-denial coverage exactly like an RLS policy.
3. **Grants stay closed-by-default** (ADR-0011): `execute` to `authenticated`, never to
   `anon`. The function takes no group argument that could widen the caller's scope.
4. **Freshness inherits ADR-0013.** The RPC reads the matview, so standings are as fresh
   as the last grading refresh; it introduces **no** new invalidation path.

This ADR is `Proposed` and gates _graduation_, not the experiment. PR #394 may remain
parked with its client-side mirror for as long as it is an unshipped experiment.

## Consequences

- **Helpful:** one scoring implementation, which removes the web/mobile drift risk at its
  root. Any future client reads standings with a single RPC call under the existing auth
  model — no service-role secret ever ships in a client, and no per-client aggregation code
  is written or maintained.
- **Harmful / cost:** a `SECURITY DEFINER` function is a trust-boundary surface that must
  be reviewed and pgTAP-tested with the same rigor as RLS — a membership-filter bug would
  leak cross-group standings. The RPC's projected columns must be kept in lockstep with the
  matview shape. Graduation carries a rework cost: `mobile/src/domain/leaderboard.ts` must
  be rewritten to call the RPC and its client-side aggregation thrown away.
- **Migration:** additive and low-risk — one migration adds the function, its grants, and
  pgTAP coverage; no schema or data change, and the web app is untouched unless it opts in.

## Alternatives considered

- **Keep the client-side mirror (PR #394 status quo).** Zero backend work, but permanently
  duplicates scoring across TS and SQL; every scoring / drop-worst-week change becomes a
  two-place edit that diverges silently if one side is missed. Acceptable for an experiment,
  not for a shipped client.
- **Add RLS to the matview.** Postgres matviews cannot carry RLS (ADR-0013 §3). Converting
  standings back to a per-request `security_invoker` view _would_ carry RLS but returns to
  the per-load multi-join aggregation ADR-0013 deliberately removed. Rejected.
- **Expose the service-role read to mobile via an edge function / server proxy.** Puts a
  server tier back in front of a deliberately backendless client (or risks a service-role
  key near the client). A `SECURITY DEFINER` RPC achieves the same caller-scoping with no
  service tier and no elevated client secret.
- **Ship the mobile app on the mirror and fix later.** Ships known-divergent standings
  logic to users; the drift is invisible until someone's mobile standings disagree with the
  web leaderboard. Rejected as a graduation gate.

## Follow-up

- Implementation issue to create when the mobile app is greenlit for graduation: add the
  `SECURITY DEFINER` standings RPC + closed-by-default grants + pgTAP cross-group-denial
  coverage; rewrite `mobile/src/domain/leaderboard.ts` to call it and delete the
  client-side aggregation; optionally migrate the web standings read onto the same RPC to
  retire the service-role path.
- If the mobile experiment is abandoned, mark this ADR `Rejected` rather than leaving it
  `Proposed` indefinitely.
- Revisit if a future client genuinely needs offline / client-side standings computation
  (e.g. an explicit offline mode), which is the one case this decision forecloses.

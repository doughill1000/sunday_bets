# Client-query load-classification inventory

Governed by **ADR-0033** (issue **#602**, supersedes #381). Every app-route
`+page.server.ts` / `+page.ts` load is classified as exactly one of:

- **(a) Pure data read → client query.** Move the read to a `createQuery` hitting a
  new or existing `+server.ts` endpoint, following the ADR-0017 convention verbatim
  (`?groupId=&season=` validated against `locals.memberships` before the service-role
  query; query keys per `(groupId, season, …)`).
- **(b) Server-only concern → stays on the server.** Auth guards/redirects,
  admin-gated loads, cron endpoints, and any sensitive/per-role data.

This is the contract later per-route PRs must stay honest against. Update the
**Status** column as each route migrates — this file is a living artifact, not a
point-in-time snapshot. "Migrated" rows link the PR that moved them.

## App routes (`src/routes/(app)/**`)

| Route             | Class                   | Status                                  | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------- | ----------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/stats`          | (a), hybrid             | Migrated (ADR-0017, pre-#602)           | Season-scoped stats payload is a `createQuery` (`['stats', groupId, season]`); the server `load` only resolves season metadata (needed to build the query key) plus a streamed, uncached career-detail read.                                                                                                                                                                                                                                                                                                     |
| `/league`         | (a), hybrid             | Migrated (ADR-0017 extension, pre-#602) | Standings/all-time/group payloads are `createQuery`s; the server `load` resolves the view/season/week and composes the per-user, RLS-gated Weekly breakdown, which stays server-only (boundary 3: differs per user, never cached).                                                                                                                                                                                                                                                                               |
| `/league/manage`  | (a), hybrid             | Migrated (ADR-0017 extension, pre-#602) | Shareable Group payload (name/members/honors/badges) is a `createQuery`; commissioner-only data (invites, grading config, role flags) stays server-only and is never cached (boundary 3).                                                                                                                                                                                                                                                                                                                        |
| `/market`         | (a), hybrid             | Migrated (ADR-0017 extension, pre-#602) | League-wide team ATS + forward slate are `createQuery`s (group-independent); the server `load` only resolves season metadata.                                                                                                                                                                                                                                                                                                                                                                                    |
| `/recap`          | (a)                     | **Migrated — this PR (#602)**           | `getRecentRecaps` + `getSeasonWeeklyAwards` are both pure `(groupId, seasonYear)`-filtered, shareable reads (recap prose + weekly hardware/season shelf) with no sensitive branching — the same shape as the already-migrated Stats/Group payloads.                                                                                                                                                                                                                                                              |
| `/wrapped`        | (a)                     | Not migrated — candidate                | `getSeasonWrapped` returns a shareable `league` half and a `player` half scoped to `currentUserId`. Mirrors the Weekly-breakdown split already established for `/league`: the league half can cache like Stats/Group; the per-viewer player half would need its own (non-shareable) key or to stay server-only. Deferred so this PR stays one clean, low-risk migration; a good next candidate given it already fits the established split pattern.                                                              |
| `/picks`          | (a), highest complexity | Not migrated — deferred, own PR         | Highest-traffic route in the app (every member, every week) but also the highest-risk: interleaves shareable reads (games/lines) with per-user RLS-gated reads (my picks, group picks, all-in declarations, status board), real-time kickoff-lock gating, and frequent mutations (making/changing picks) that need immediate, correctly-targeted `invalidateQueries` rather than a blanket refetch. Migrating it well needs its own scoped PR with dedicated parity tests per sub-read, not a slice of this one. |
| `/settings`       | (b)                     | Server-only                             | Personal account data (own `notification_prefs`, linked OAuth identities via `locals.supabase.auth.getUserIdentities()`) with no `groupId` dimension — doesn't fit the established group-scoped validated-param convention, and is low-traffic. A user-scoped query convention could be introduced later if this becomes worth caching.                                                                                                                                                                          |
| `/admin`          | (b)                     | Server-only                             | Admin-gated (enforced by `(app)/admin/+layout.server.ts`); settings/cron/season config are commissioner-of-the-whole-app data, explicitly excluded by ADR-0033 boundary 3.                                                                                                                                                                                                                                                                                                                                       |
| `/admin/feedback` | (b)                     | Server-only                             | Admin-gated triage queue; reads/writes go through the service role behind the same admin gate. Sensitive (raw user feedback), never client-cached.                                                                                                                                                                                                                                                                                                                                                               |

## Root / auth / join routes

| Route           | Class | Status      | Rationale                                                                                                                                          |
| --------------- | ----- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/` (root)      | (b)   | Server-only | Pure redirect (`/picks`), no data.                                                                                                                 |
| `/auth`         | (b)   | Server-only | Form actions only (OAuth/sign-in/sign-up/reset-request); no `load` reads data.                                                                     |
| `/auth/reset`   | (b)   | Server-only | Recovery-token exchange + session guard; a security-sensitive redirect flow, not a data read.                                                      |
| `/auth/error`   | (b)   | N/A         | Static content, no `load`.                                                                                                                         |
| `/join`         | (b)   | Server-only | Auth guard + `canCreateGroup` gate; the `create` action calls the `create_group` RPC (a trust-boundary write).                                     |
| `/join/[code]`  | (b)   | Server-only | Invite preview/redemption via SECURITY DEFINER RPCs (`preview_invite`, `redeem_invite`) — the RPC is the real authorization; not a cacheable read. |
| `/join/pending` | (b)   | N/A         | Static content, no `load`.                                                                                                                         |

## Demo routes (`src/routes/demo/**`, public/no-auth)

| Route               | Class | Status      | Rationale                                                                                                                                                                                                                                                                                         |
| ------------------- | ----- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/demo`             | (b)   | Server-only | `getDemoSnapshot()` is a synchronous in-memory read of a committed, build-time snapshot (ADR-0026) — there is no network/DB round-trip to save. Moving it behind an endpoint would add HTTP overhead where none exists today for no offline benefit (marketing route, not an installed-PWA flow). |
| `/demo/leaderboard` | (b)   | Server-only | Same rationale as `/demo`.                                                                                                                                                                                                                                                                        |
| `/demo/recap`       | (b)   | Server-only | Same rationale as `/demo`.                                                                                                                                                                                                                                                                        |
| `/demo/wrapped`     | (b)   | Server-only | Same rationale as `/demo`.                                                                                                                                                                                                                                                                        |

## Layouts (out of scope, listed for completeness)

ADR-0033's classification applies to `+page.server.ts` / `+page.ts` loads, not
layout loads — layouts already run once per navigation subtree rather than
re-running the full page load, so they don't carry the same round-trip cost this
migration targets. Listed here so the inventory is a complete map of every load in
the app:

| Layout                          | Rationale                                                                                                                        |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `/+layout.server.ts`            | Session resolution + streamed, per-user recap-flash/champion-crown reads gated on `locals.user`/`locals.groupId` — auth-coupled. |
| `(app)/+layout.server.ts`       | The auth guard itself (`safeGetSession` + redirect to `/auth`) — the trust boundary, not a data read.                            |
| `(app)/admin/+layout.server.ts` | The admin gate (`isAdmin` check + 403) — the trust boundary, not a data read.                                                    |
| `demo/+layout.server.ts`        | Same in-memory-snapshot rationale as the demo pages above.                                                                       |

## Summary

- **Migrated (client-query, (a)):** Stats, League, League/manage, Market — all
  pre-#602 under the original ADR-0017 pattern — plus **Recap (this PR)**.
- **(a) candidates, not yet migrated:** Wrapped (next-best fit — same
  shareable/personal split already proven on `/league`); Picks (highest traffic,
  deferred to its own PR given lock-timing and mutation-invalidation risk).
- **(b) server-only, by design:** Settings, Admin, Admin/Feedback, all auth/join
  routes, the root redirect, and all demo routes.

Each future migration keeps this table current and stays an independently
mergeable PR (ADR-0033 boundary 5).

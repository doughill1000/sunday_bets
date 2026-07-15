# ADR-0026: Public shareable demo season served from a generated read-only snapshot

- Status: Accepted
- Date: 2026-07-08
- Issue: #460
- Supersedes: None

## Context

The product's value is legible only over time — leaderboards, season awards and
badges, rivalries, the Season Wrapped (#347), the AI recap (#283/ADR-0008), and the
League ATS cuts (#406/#424). A brand-new visitor lands on none of it: an empty
leaderboard with one name and zero history is the worst possible first impression for
a results-compound-over-time game. The immediate need is **top-of-funnel**: a link
the owner can share so a stranger sees the finished experience and decides to start
their own league, **without exposing the owner's real, private league** (real names,
real trash-talk, real standings).

The forcing decision is not "should we build a demo" but **how demo data reaches an
unauthenticated public surface without ever contaminating real gameplay data**. Two
constraints drive it:

- **A new public, unauthenticated read surface** is a trust boundary. Whatever it
  serves is world-readable and cacheable at the edge.
- **Demo data must never enter real standings.** ADR-0013 serves leaderboards/stats
  from materialized views refreshed on grading; any demo rows living in production
  tables would need `is_demo` filtering on every current and future query, forever —
  a permanent fairness-integrity liability.

This meets the ADR trigger on three counts: it introduces a public trust boundary, it
establishes a cross-cutting pattern (snapshot-as-build-artifact) that future
marketing-worthy features inherit, and it creates a standing maintenance constraint on
those features.

Product questions settled with the owner before writing:

- **Snapshot, not a live demo league.** The public path serves a frozen artifact, not
  live DB rows (see Decision 1 and Alternatives).
- **Fully fictional, not an anonymized real league.** Authoring fake identities avoids
  leaking real behavior/PII and keeps the owner comfortable sharing it publicly.
- **Viewer inhabits a "you" persona.** The Wrapped card and AI recap are
  second-person; a spectator view of someone else's recap is weak, so the snapshot
  designates one fictional player as the viewer (see Decision 3).
- **The picks screen matters as much as the payoff.** The demo must show the _verb_
  (making picks against the spread), so the snapshot captures a frozen "live" week in
  addition to the completed season (see Decision 2).

## Decision

1. **The public demo is served from a generated, read-only snapshot — a build
   artifact, never live production rows.** A regeneration step seeds a curated,
   fully-fictional league (reusing the existing `db:seed:demo` infrastructure), runs it
   through the **real** grading → awards/badges → Wrapped → AI-recap pipeline, and
   exports the rendered result to a checked-in fixture. The public route reads only
   that fixture. **No demo rows exist in production tables**, so isolation from real
   leaderboards/matviews/awards is _structural_ — there is nothing to filter out
   anywhere — rather than enforced by per-query predicates.

2. **The snapshot captures two temporal vantage points of the same fictional season:**
   a **frozen "live" week** (a real slate with spreads and the persona's locked picks,
   ideally the week of a dramatic All-In) powering the **picks screen**, and the
   **completed season** powering the leaderboard, season awards/badges, Season Wrapped,
   and recap. The demo narrative is "here's how you play → here's what it builds to."

3. **The visitor inhabits a designated "you" persona.** One fictional player is marked
   as the viewer; personalized surfaces (Wrapped, recap, rivalries, the persona's
   picks) render from that player's frozen payload. The perspective is **read-only** —
   every action control (lock a pick, declare All-In) is disabled and becomes a
   "Sign up to do this" call-to-action. "As a player" is a viewing lens, not
   interactivity.

4. **The AI recap is frozen at regeneration time; the public page makes zero LLM calls
   per visitor.** The recap (and any generated copy) is produced once during
   regeneration, under ADR-0008's cost cap and voice boundary, and then served as static
   text. The unauthenticated page therefore has no per-view AI cost, no latency, and no
   data-retention surface.

5. **The snapshot is fully fictional.** It is authored, not derived by anonymizing the
   owner's real league. No real user identity, pick, or standing appears in it.

6. **Staleness is prevented structurally, not by discipline.** Because the fixture is a
   generated artifact:
   - a **regeneration command** (`pnpm demo:snapshot`, TBD name) re-derives it through
     the real pipeline, so data-shape changes are picked up automatically instead of by
     hand-patching JSON;
   - a **CI drift-guard test** renders the demo route against the committed snapshot and
     fails if it throws or references missing fields — this is the enforcement that
     forces a regenerate when a feature outgrows the fixture;
   - a **`refresh-demo-snapshot` Claude skill** wraps the judgment steps (curate the
     season narrative, regenerate, eyeball recap quality) around the mechanical command;
   - the **process rule** ("shipping a marketing-worthy surface? refresh the demo
     snapshot") lives in `AGENTS.md`'s delivery workflow — the durable doc both agents
     read — not in `CLAUDE.md`, which defers to it. The CI guard covers data-shape
     drift; the AGENTS.md line covers _coverage_ drift (a new feature works but the demo
     season doesn't happen to exercise it).

**Explicitly out of scope / deferred:**

- **Interactive picks in the demo** (client-side, non-persisted "try it, then sign up
  to save") — a stretch enhancement; v1 is read-only.
- **New-player activation** (starter leagues, solo "play a past season") — a separate
  concern from this top-of-funnel link; not decided here.
- **Multiple demo seasons / rotating snapshots** — one curated season for v1.
- **Public share cards** (#348 Wrapped share) — related marketing surface, its own
  privacy ADR.

## Consequences

**Helpful:**

- Isolation from real gameplay data is structural and permanent: no demo rows in prod
  means no `is_demo` predicate to remember on any current or future query.
- The public page is static and edge-cacheable, makes zero LLM calls, and exposes no
  write path or real user data.
- Regenerating through the real pipeline keeps the demo honest — it shows what the
  product actually produces, not a hand-mocked approximation — and the CI drift-guard
  keeps it from silently rotting.

**Costs:**

- A frozen snapshot can _undersell_ a new feature that ships but isn't exercised by the
  curated season; the AGENTS.md rule plus periodic curation is the mitigation, and this
  is an ongoing maintenance obligation on marketing-worthy features.
- The demo needs its own read paths / a "demo mode" that render from the fixture rather
  than live queries; these must track the real components as the UI evolves (the CI
  guard bounds, but does not eliminate, this drift).
- A curated fictional season is authored content that needs a believable narrative
  (rivalry, comeback, signature All-In) to be compelling — real editorial effort, not
  just seed data.

## Alternatives considered

- **Live demo league in production tables, filtered out everywhere by `is_demo`.**
  Highest fidelity (reuses every real query/component automatically), but every
  leaderboard, matview, award, and future query must exclude it forever, and a single
  missed predicate leaks fake data into real standings on a live public link. Rejected
  in favor of a snapshot with structural isolation.
- **Anonymize the owner's real league.** Zero authoring effort, but leaks real behavior
  and standings, risks PII, and the owner is understandably not comfortable sharing it.
  Rejected in favor of fully fictional data.
- **Spectator view (browse someone else's finished season) instead of a "you"
  persona.** Simpler, but the Wrapped/recap are second-person and fall flat when
  they're not _yours_. Rejected — the persona is the hook.
- **Payoff only (leaderboard + awards + Wrapped), no picks screen.** Shows the trophy
  case but never the weekly verb, leaving "what do I actually do here?" unanswered.
  Rejected — the frozen live week is cheap to add and answers it.
- **Live AI recap generated per visit.** Fresh, but adds per-view LLM cost, latency,
  and a data-retention surface on an unauthenticated page for no benefit over a frozen
  recap. Rejected.

## Follow-up

- **Implementation issue (#460)** — may proceed once this ADR is Accepted: the public
  route + demo-mode rendering, the snapshot fixture and `demo:snapshot` generator, the
  CI drift-guard test, and the `refresh-demo-snapshot` skill + AGENTS.md rule.
- **AGENTS.md** — add the "refresh the demo snapshot" line to the delivery workflow.
- **#347 / #283** — the Wrapped and recap generators are reused by the snapshot
  generator; changes there should keep the demo regenerable.
- Revisit interactive picks and multi-season snapshots only with real funnel data.

## Amendment history

- 2026-07-08 — Accepted alongside the #460 implementation: the `/demo` route group, the
  `demo-snapshot.json` fixture + `pnpm demo:snapshot` generator (a cron-secret-guarded in-app
  export endpoint that reuses the real read-model/Wrapped pipeline), the CI drift-guard test,
  and the `refresh-demo-snapshot` skill + AGENTS.md refresh rule.
- 2026-07-15 (#669) — Refines §6's staleness-prevention clause with a standing IA rule: **the
  demo mirrors the app's tab structure, and every new first-class tab ships a demo surface.**
  The demo had drifted to a superseded four-tab shape (Picks · League · Wrapped · Recap) that
  showed neither Stats, Market, the credibility rating, nor weekly hardware — coverage drift the
  CI guard could not see, because it only renders the surfaces the demo already uses. #669 closed
  that gap structurally rather than by discipline: it extracted the two hand-mirrored components
  (`DemoStandingsTable`, `DemoPicksBoard`) into a shared `StandingsTable` and a `readonly` mode on
  the real `PicksBoard`, so the demo and the authed app render identical markup and can no longer
  diverge silently; extended the generator/fixture with `weeklyAwards`/`stats`/`market`; rebuilt
  the nav to the real four tabs (Picks · League · Stats · Market); and hardened the drift-guard to
  render the new surfaces plus assert the fixture's badge set is a subset of the live catalog (the
  check that would have caught the #647 badge-count staleness the day it shipped). Going forward,
  a PR that adds a first-class tab to the authed app is not done until `/demo` gains the matching
  surface in the same PR or a tracked follow-up — mirrors the existing "shipping a marketing-worthy
  surface? refresh the demo snapshot" AGENTS.md rule, but for structural IA rather than content.

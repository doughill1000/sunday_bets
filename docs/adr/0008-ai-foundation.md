# ADR-0008: AI integration foundation — gateway, deterministic-mechanic/AI-voice split, group-scoped outputs, and metered cost controls

- Status: Proposed
- Date: 2026-06-27
- Issue: #189
- Supersedes: None

## Context

AI is greenfield in Sunday Bets — there is no `@ai-sdk`, `anthropic`, or `openai`
dependency in the repo today. The first integration is therefore not a local
implementation detail but a cross-cutting foundation: it adds a new external service, a
new persistent data model for generated text, recurring per-call spend, and — because the
first use cases narrate competitive results — a path that sits next to gameplay fairness.
Each of those independently triggers the `docs/adr/README.md` test, so the foundation is
decided once, here, rather than rediscovered per feature.

The driving use case is the **AI League Commentator** (epic #283, Wave 1 #284), graduated
from #229 item 5: a weekly, auto-generated recap that voices already-settled results
(biggest beat, biggest choke, most-contrarian hit, rivalry swings, badge changes) with
zero added player effort. #189 also catalogues four further data-only starters (personal
season "Wrapped," tendency/calibration coach, group digest, head-to-head rivalry
narratives) that would reuse the same foundation.

The groundwork these features narrate already exists and is deterministic: behavioural
data is aggregated in `service_role`-scoped materialized views (`stats_*`,
`leaderboard_*`) refreshed on grading (ADR-0013), over `pick_settlement` + `picks.weight`,
soon joined by the #277 lore read-models (#279/#280/#281, v2.5). A mature batch lane
(`src/lib/server/cron.ts`, `src/routes/(app)/api/cron/*`, `.github/workflows/cron-*.yml`,
and `cron_run_log`) and a usage-metering precedent (`recordUsage()` in
`src/lib/server/odds.ts`) are already in place to host and bound the work.

This ADR is the gate: AI feature-build issues (#284 onward) are **blocked until it is
Accepted**. It stays **Proposed** until #189's throwaway staging spike returns a measured
per-run cost and acceptable sample quality, which finalize the model choice, budget cap,
and retention window left open below.

## Decision

Introduce AI through a single governed entry point. Boundaries future work must preserve:

1. **Provider: Vercel AI Gateway, server-side only.** Models are addressed by plain
   `provider/model` strings (not provider-specific SDK packages), so the model can be
   swapped without code churn and we keep unified observability, model fallback, and
   zero-data-retention defaults. Which model — and whether a separate fallback model is
   used — is left entirely to #189's spike and recorded on acceptance; this foundation
   commits only to the Gateway and the `provider/model`-string approach. No model key or
   call ever reaches the client.

2. **Deterministic mechanic, AI voice only (the fairness boundary).** Every outcome — who
   won, who choked, who was contrarian, the head-to-head math, which badge changed hands —
   is computed by pure, unit-tested server code reading the ADR-0013 matviews and the #277
   read-models. A server-side builder emits a compact JSON **facts packet of settled facts
   only**; the LLM receives that packet and returns **prose only**. The model never queries
   the database, never has tools, never decides an outcome, and never influences scoring or
   grading. AI is structurally excluded from every fairness-bearing path.

3. **PII and input boundary.** The model sees **display names only** — never emails, auth
   IDs, or other PII. A deterministic **roastable-fact allowlist** gates what may enter the
   packet: in-app gameplay facts only, no real-world or off-topic material, no "low blows."
   Because display names are user-controlled, packet text is treated as untrusted input;
   boundary 2 (no tools, no DB, prose-out) is what keeps that safe from prompt injection.

4. **Consent and tone are first-class.** A per-group **spice** setting (e.g. mild | medium
   | spicy) and a per-player **"roast me?" opt-out** (default on; opted-out players are
   narrated neutrally) gate generation. The exact spice→prompt mapping and the allowlist
   contents are tuned against real output by #189's spike and recorded here on acceptance.

5. **AI output is persisted in group-scoped tables.** Generated text lives in
   group-scoped tables (`ai_recaps` is the first) under the closed-by-default grant/RLS
   baseline (ADR-0011) and the group-tenancy boundary (ADR-0002): RLS by group membership,
   explicit grants, pgTAP cross-group isolation. Each row stores **both the prose and the
   facts packet** that produced it, for reproducibility, moderation, and debugging. Writes
   come from the service-role batch path; reads are group-scoped.

6. **Spend is metered and capped, with a deterministic fallback.** Every model call is
   metered via the existing `recordUsage()` pattern. Generation runs **once per group per
   graded week** (for the recap). A **per-group/week budget cap** is enforced; exceeding it
   — or any call failure/timeout — yields **deterministic fallback copy**, never an error,
   so the weekly ritual never breaks. The cap value is set from the spike's measured
   per-run cost (× groups × weeks) before acceptance.

7. **AI runs in the batch/cron lane, not on request paths.** Generation is triggered after
   the weekly grading run, reusing `cron.ts`, `api/cron/*`, `cron-*.yml`, and `cron_run_log`.
   This foundation puts no AI call on a synchronous user-facing request path, keeping spend
   and latency predictable.

8. **Data retention is minimized.** Zero-data-retention is used at the Gateway/provider
   where available; persisted outputs live only in the group-scoped tables under normal
   group data lifecycle. Exact retention specifics are confirmed alongside the spike.

AI features are **free to all players at launch**; paywalls and premium tiering are out of
scope for this foundation and remain a separate future decision.

## Consequences

- **Helpful:** one governed door for all AI — provider, privacy, and cost decided once.
  Fairness is structurally insulated (the model cannot touch scoring or the DB). Spend is
  bounded, metered, and degrades gracefully to deterministic copy. The design reuses the
  matview, cron, and metering infrastructure already in production, so feature builds add
  prompt + persistence, not new plumbing. Outputs are group-isolated and reproducible.
- **Harmful / cost:** a new external dependency and API key to provision and rotate per
  environment (staging now for the spike, prod later). A new standing invariant — every
  AI-output table follows the metering + fallback + RLS-isolation + facts-packet contract.
  Prompt spend is recurring and must stay under cap. The roastable-fact allowlist is
  maintenance: each new fact type the model may narrate is a deliberate, reviewed addition.
- **Migration:** `ai_recaps` and any future AI-output table go through the hash-ledger
  flow + generated `src/lib/types/supabase.ts`, serialized per the DB rules — **deferred to
  the build issues** (#284 ff.), not done here. #189's spike is throwaway and touches
  neither the ledger nor shared paths.
- **Status:** remains **Proposed** until #189's spike reports a measured per-run cost and
  acceptable sample quality; those numbers finalize the model choice, budget cap, and
  retention window. Build issues are blocked until this is Accepted.

## Alternatives considered

- **Direct provider SDK (`@ai-sdk/anthropic`, `openai`) instead of the Gateway.** Rejected:
  loses unified observability, built-in model fallback, and zero-retention defaults, and
  couples us to one provider. The Gateway lets us change models via a string.
- **Let the LLM compute or decide any outcome, or read the DB directly.** Rejected
  outright: non-deterministic, unauditable, and a direct violation of gameplay fairness.
  The deterministic-mechanic / AI-voice split exists precisely to forbid this.
- **Synchronous, on-request generation.** Rejected for the foundation: unbounded cost and
  latency on hot paths. The batch/cron lane keeps generation to one predictable call per
  group per week.
- **Generate-and-display without persistence.** Rejected: loses reproducibility, re-spends
  on every view, and leaves nothing to moderate or audit.
- **No foundation ADR — let each feature pick its own provider/cost/privacy.** Rejected:
  AI is cross-cutting; per-feature drift on exactly these axes is what this ADR prevents.

## Follow-up

- **#189** — measured-cost spike on staging (recommended: weekly recap / Commissioner).
  Finalizes model IDs, per-run cost, budget cap, spice/allowlist dial, and retention →
  moves this ADR to **Accepted**. Requires Vercel AI Gateway access + a model key in the
  staging env; spike code is discarded, not merged.
- **#283** — AI League Commentator epic (player-facing build track), blocked until
  Accepted. **#284** — Wave 1 weekly recap MVP (v2.6): builds the `RecapFacts` builder, the
  Gateway voice call + metering, the `ai_recaps` table, the post-grading trigger, the
  in-app surface, and the fallback copy.
- **#277** Wave 1 read-models (#279/#280/#281, v2.5) feed the facts packet.
- The four other data-only starters catalogued in #189 inherit this foundation when
  scheduled.

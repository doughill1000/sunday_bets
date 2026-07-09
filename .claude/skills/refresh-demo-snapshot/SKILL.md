---
name: refresh-demo-snapshot
description: Regenerate the public demo-season snapshot fixture that the unauthenticated /demo route serves — reseed the fictional league, re-derive it through the real grading → awards → Wrapped → recap pipeline, and eyeball the frozen prose before committing. Use when Doug says "refresh the demo", "regenerate the demo snapshot", after shipping a marketing-worthy feature the demo season should show off, or when the CI drift-guard fails because a demo surface outgrew the fixture. It does NOT touch prod data (the snapshot is a build artifact, ADR-0026) and is separate from cut-release / start-issue.
---

# Refresh the demo snapshot

Regenerate `src/lib/server/demo/demo-snapshot.json` — the committed fixture the public
`/demo` route group renders (#460, ADR-0026). The fixture is a **generated build artifact**:
the mechanical part is `pnpm demo:snapshot`; this skill wraps the judgment around it (curate
the season, pick a real LLM run, eyeball prose quality). No prod data is ever touched — the
demo is structurally isolated (there are no demo rows in production tables).

## When to run it

- A **new marketing-worthy feature** shipped that the demo season should exercise (the
  coverage-drift half of ADR-0026 — the CI guard can't catch a feature the fixture simply
  doesn't happen to show).
- The **CI drift-guard test** (`src/lib/server/demo/__tests__/demo-snapshot.test.ts`) failed
  because a demo-rendered component grew a data dependency the frozen fixture doesn't satisfy.
- You want **real LLM prose** in the frozen Wrapped/recap rather than the deterministic
  fallback (the local run bakes fallback prose; see step 4).

## Steps

1. **Seed the fictional league** into local Supabase (Docker Desktop must be running — if a
   `pnpm db:*` command fails with `ECONNREFUSED 127.0.0.1:54322` the stack is down, so
   `supabase start` first):

   ```sh
   pnpm db:reset:demo      # reset migrations + seed the demo league (deterministic)
   # or, on an already-seeded DB: pnpm db:seed:demo   (idempotent, no migration reset)
   ```

   This builds the curated multi-season league the snapshot draws from. The featured
   completed season, persona (its champion), and frozen live week are all derived from this
   seed — so this is where you curate the narrative (rivalry, comeback, a signature All-In)
   if you want to sharpen it. The **roast tone** is the featured group's `spice` in
   `supabase/scripts/seed-demo/index.ts` ("Sunday Bets" is seeded `spicy` — full villain-mode
   Commissioner is the marketing hook); change it there if the voice needs more/less edge.
   Keep seed edits additive; `db:reset:demo` also backs local dev.

2. **Start the app** so the export endpoint can run inside the SvelteKit runtime (it reuses
   the real read-model / Wrapped-generation layer, which can't be imported by a bare script):

   ```sh
   pnpm dev --port 5173     # or point at a deploy — see step 4
   ```

3. **Regenerate the fixture**:

   ```sh
   pnpm demo:snapshot       # GETs /api/cron/demo-snapshot, writes demo-snapshot.json
   ```

   The persona defaults to the featured season's champion; override the featured identity with
   `DEMO_SNAPSHOT_GROUP` / `DEMO_SNAPSHOT_PERSONA` / `DEMO_SNAPSHOT_SEASON` env vars if needed.

4. **Real LLM prose (do this for anything that ships).** The voice layer only makes a real
   gateway call when `AI_GATEWAY_URL` + `AI_GATEWAY_TOKEN` are set (ADR-0008); without them it
   serves deterministic fallback copy and the script prints `AI prose: fallback` (the demo still
   presents it as finished copy — provenance lives in `meta.aiProse`). The repeatable way to get
   genuine prose is to run **locally with the creds in `.env.local`** — no deploy needed:

   ```sh
   # .env.local (gitignored). URL is the public gateway host; token is the per-project secret
   # from the Vercel project env (dashboard → Settings → Environment Variables, or `vercel env pull`).
   AI_GATEWAY_URL=https://ai-gateway.vercel.sh
   AI_GATEWAY_TOKEN=<vercel-ai-gateway-key>
   ```

   With those set, the normal local loop (steps 2–3) bakes real `openai/gpt-5.4` prose and the
   script prints `AI prose: live`. Verify with the probe if a run unexpectedly falls back: a
   `POST {AI_GATEWAY_URL}/v1/chat/completions` with `Authorization: Bearer <token>` and
   `max_tokens >= 16` should return HTTP 200.

   > **Don't** point `DEMO_SNAPSHOT_BASE_URL` at a stock Vercel deploy to borrow its creds: a
   > normal deploy connects to **prod, which has no demo rows** (ADR-0026 isolation), so the
   > endpoint can't find the demo league there. Local-creds is the supported path. (A deploy only
   > works if its own DB carries the demo seed — not the case for prod or previews.)

5. **Eyeball the result.** Load the four demo surfaces logged out and read them as a stranger:

   ```sh
   # /demo (frozen live week) · /demo/leaderboard · /demo/wrapped · /demo/recap
   ```

   Check the persona reads aspirationally, the recap/Wrapped voice lands, and every surface is
   populated. Confirm `meta.aiProse` and the persona/season in the script output are what you
   intended.

6. **Validate + commit.** Run the drift-guard + lint:
   ```sh
   pnpm test:unit -- src/lib/server/demo/__tests__/demo-snapshot.test.ts
   pnpm lint && pnpm check
   ```
   Commit the regenerated `demo-snapshot.json` (a large but clean, pretty-printed diff).

## Remember

- The snapshot is **fully fictional** and a **build artifact** — never derived from a real
  league, never written to production tables (ADR-0026).
- The CI drift-guard covers **shape** drift; this skill + the `AGENTS.md` delivery-workflow
  rule cover **coverage** drift (a shipped feature the demo doesn't exercise).
- Keep the fixture's `meta.aiProse` honest: `live` only when a real gateway call produced the
  prose.

## See also

- `docs/adr/0026-public-demo-season-snapshot.md`
- `supabase/scripts/demo-snapshot/index.ts` and `src/routes/(app)/api/cron/demo-snapshot/`
- `AGENTS.md` §"Delivery workflow" (the refresh rule)

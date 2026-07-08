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

1. **Seed the fictional league** into local Supabase (Docker must be up):

   ```sh
   pnpm db:reset:demo      # reset migrations + seed the demo league (deterministic)
   ```

   This builds the curated multi-season league the snapshot draws from. The featured
   completed season, persona (its champion), and frozen live week are all derived from this
   seed — so this is where you curate the narrative (rivalry, comeback, a signature All-In)
   if you want to sharpen it. Keep seed edits additive; `db:reset:demo` also backs local dev.

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

4. **Real LLM prose (optional but preferred for launch).** The AI Gateway creds only exist in
   the Vercel runtime (ADR-0008), so a **local** run bakes the _deterministic_ Wrapped/recap
   prose (the script prints `AI prose: fallback`, and the demo still presents it as finished
   copy — provenance is recorded in `meta.aiProse`). For genuine LLM prose, run the same
   command against a deploy that has the gateway creds:

   ```sh
   DEMO_SNAPSHOT_BASE_URL=https://<preview-or-prod-host> pnpm demo:snapshot
   ```

   (still needs `CRON_SECRET` for that host in `.env`.)

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

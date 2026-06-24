# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Read and follow `AGENTS.md`. It is the shared instruction source for Claude, Codex,
and other coding agents in this repository.

For planned work, also read `docs/WORKFLOW.md`, the assigned GitHub Issue, and every
linked or governing ADR before editing. Do not maintain a separate copy of repository
rules here; that would allow the two agent workflows to drift.

The natural-language issue-creation triggers and draft-before-write approval gate in
`AGENTS.md` apply to Claude unchanged.

When creating a new worktree, copy the gitignored `.env*` files from the main
checkout into it (a fresh worktree has none and cannot reach Supabase / The Odds
API without them). Use `scripts/new-worktree.ps1`, which creates the worktree,
copies the env files, installs deps, and can launch dev on a non-default port. To
run a worktree's dev server without switching repos:
`pnpm -C ..\<worktree> run dev -- --port 5174`. See `AGENTS.md` ("Delivery
workflow") and `docs/WORKFLOW.md` ("Claim and isolate work") for the full rule.

## Commands

```sh
pnpm dev                          # dev server at http://localhost:5173
pnpm lint                         # prettier + eslint (not run in CI — run this yourself)
pnpm check                        # svelte-check type checking (not run in CI)
pnpm format                       # auto-format with prettier

pnpm test:unit                    # Vitest unit tests (src/**/__tests__), jsdom, no Docker needed
pnpm test:integration             # Vitest against running local Supabase (tests/integration/)
npx supabase test db              # pgTAP tests (supabase/tests/)
pnpm test:e2e                     # Playwright end-to-end (tests/e2e/)

# Run a single unit test file:
pnpm test:unit -- src/lib/server/__tests__/grading.test.ts

# Database
pnpm db:migration --name=describe_the_change   # generate migration from supabase/src/** changes
pnpm db:migration:check                         # verify ledger integrity (read-only)
pnpm db:push:local                              # apply pending migrations + regenerate TS types
pnpm db:types                                   # regenerate src/lib/types/supabase.ts from local DB
pnpm db:reset:local                             # reset migrations + clone data from prod
pnpm db:reset:demo                              # reset migrations + seed demo data (offseason UI work)
pnpm db:seed:demo                               # re-seed demo data without migration reset (idempotent)
```

`pnpm build` fails on Windows (EPERM symlink in adapter-vercel packaging). The Vite
build phases completing is sufficient local validation; real builds run on Vercel.

# CLAUDE.md

Guidance for AI agents working in this repo. Human-facing setup, commands, and
migration docs live in `README.md`; the feature/automation plan lives in
`ROADMAP.md`. Read those first — this file covers the architecture and the things
that are easy to get wrong.

## What this is

Sunday Bets — a private NFL pick'em PWA for ~6 friends. Players pick a team against
the FanDuel spread each week, weight each pick (Low = 1, Medium = 3, High = 5, or one
All-In = 10 per week), and picks **lock at kickoff**. Lines come from The Odds API;
graded results settle into `pick_settlement` and feed the weekly/season leaderboards.

Stack: SvelteKit 2 / Svelte 5 · Supabase (Postgres + Auth + RLS) · Tailwind 4 +
shadcn-svelte · vite-plugin-pwa · Sentry · Vercel.

## Repo map

- `src/routes/` — SvelteKit routes. `(app)/` is the authenticated group (picks,
  leaderboard, admin, and `api/` endpoints); `auth/` handles sign-in/confirm/signout.
- `src/lib/server/` — server-only logic. `db/queries/` (reads) and `db/commands/`
  (writes) wrap Supabase; alongside them: `odds.ts` / `oddsSync.ts` (The Odds API),
  `grading.ts`, `admin.ts`, `auth.ts`.
- `src/lib/domain/rules.ts` — pure pick rules (kickoff passed, All-In once-per-week),
  mirrored server-side and in SQL.
- `src/lib/components/` — `picks/`, `admin/`, and **`ui/` is vendored shadcn-svelte:
  do not hand-edit it (it is eslint-ignored).**
- `src/lib/types/supabase.ts` — generated DB types; never edit by hand
  (regenerate with `pnpm db:types`).
- `supabase/src/` — declarative SQL sources (`schemas/`, `views/`, `functions/`,
  `policies/`, `grants/`). `supabase/migrations/` — **generated, never hand-edited**.
  `supabase/tests/` — pgTAP.
- `tests/` — `integration/` (Vitest against local Supabase) and `e2e/` (Playwright).
  Unit tests live next to the code they cover in `__tests__/`.

## Conventions that bite

- **pnpm only.** `package-lock.json` is gitignored — never create one.
- **Branches:** PRs target `develop`; `master` is production. **Branch from
  `origin/develop` after `git fetch`** — the local clone can be months stale (Doug
  works across multiple machines).
- **Confirm before any GitHub write** (push, PR, issue, gist) — see user-level CLAUDE.md.
- **Database changes** use the hash-ledger flow (full steps in README): edit
  `supabase/src/**`, run `pnpm db:migration --name=describe_the_change`, then commit
  the source change, the migration, and the ledger **together**. **Never** edit
  `supabase/migrations/` by hand and **never rename or move files under
  `supabase/src/`** — the generator would re-emit them as brand-new DDL.
- **New `public` tables need explicit `grant` + `enable row level security` +
  policies** or the Data/REST API can't see them (see ROADMAP "Cross-cutting").
- **Svelte 5 runes** is the target idiom; some components are mid-migration from
  Svelte 4 (ROADMAP Phase 2). Match the style of the file you're editing.

## Auth & admin

Sessions are **cookie-based** via `@supabase/ssr` (`src/hooks.server.ts`) — keep it
that way (localStorage storage breaks the iOS standalone PWA). `event.locals` carries
`supabase`, `session`, `user`, and `isAdmin`. **Admin = `users.role === 'admin'`** —
the single source of truth shared by `hooks.server.ts` and the `is_admin()` SQL
function used in RLS. RLS is enforced everywhere; the service-role client
(`src/lib/supabase/service.ts`) bypasses it and is **server-only**.

## Testing & CI

- Layers: unit (`pnpm test:unit`, jsdom) · integration (`pnpm test:integration` —
  needs **Docker + local Supabase running**) · pgTAP (`npx supabase test db`) · e2e
  (`pnpm test:e2e`, Playwright).
- **CI only runs unit tests on PRs to `develop`. Lint never runs in CI** — run
  `pnpm lint` and `pnpm check` yourself; green CI does not mean lint-clean.
  Playwright runs e2e against a local Supabase stack.
- `@typescript-eslint/no-explicit-any` is `error` under `src/lib` + `src/routes`
  (use real types); it is **off** for tests and `supabase/scripts/**`.

## Gotchas

- `pnpm build` fails on Windows at the adapter-vercel packaging step (EPERM symlink —
  needs elevation/Developer Mode). The Vite client+server build phases completing is
  the local validation signal; real builds happen on Vercel.
- Docker Desktop is often not running — start it before `supabase status` or
  integration tests.
- Unit tests mock `fetch` without `headers` and stub `$env` with only the keys each
  spec needs — server code touching response headers or new env vars must be
  defensive or specs break (see `recordUsage()` in `src/lib/server/odds.ts`).
- `results` / `totals` tables are **legacy** (superseded by `pick_settlement`) —
  don't build on them.
- `getWeeklyCumulative()` in `src/lib/server/db/queries/leaderboard.ts` is
  intentionally unused (reserved for the Phase 5 trend chart) — don't delete it as
  dead code.
- E2E: seeded `auth.users` rows can't password-login (they lack `auth.identities`);
  create users via `supabase.auth.admin.createUser({ email, password, email_confirm: true })`.
  Clicks on reactive controls can land before hydration wires them up — wrap such
  clicks in an `await expect(async () => { ... }).toPass()` retry. Seeding must be
  idempotent.

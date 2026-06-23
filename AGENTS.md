# AGENTS.md

Guidance for AI agents working in this repo. Read `README.md`, `docs/WORKFLOW.md`,
`ROADMAP.md`, and `docs/adr/README.md` before planned feature work, then read the
assigned issue and all relevant accepted ADRs. This file covers the architecture and
the things that are easy to get wrong.

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
- **Codex on Windows should use Corepack pnpm.** Prefer
  `corepack pnpm <command>`, or run `corepack enable` and
  `corepack prepare pnpm@<repo-version> --activate`. Do not use bundled pnpm from
  Codex runtimes unless Corepack fails, and do not rebuild `node_modules` unless
  explicitly necessary.
- **Branches:** trunk-based — PRs target `master` (production); there is no
  long-lived `develop` branch. **Branch from `origin/master` after `git fetch`** —
  the local clone can be months stale (Doug works across multiple machines). Per-PR
  Vercel preview deployments (backed by the staging Supabase project) replace a
  shared staging environment.
- **Confirm before any GitHub write** (push, PR, issue, gist) — see user-level AGENTS.md.
- **Database changes** use the hash-ledger flow (full steps in README): edit
  `supabase/src/**`, run `pnpm db:migration --name=describe_the_change`, then commit
  the source change, the migration, and the ledger **together**. **Never** edit
  `supabase/migrations/` by hand and **never rename or move files under
  `supabase/src/`** — the generator would re-emit them as brand-new DDL.
- **For Supabase schema work in Codex:** edit `supabase/src/**`, run
  `corepack pnpm db:migration --name=<name>`, run
  `corepack pnpm db:migration:check`, and run `npx supabase test db` if Docker and
  local Supabase are available.
- **New `public` tables need explicit `grant` + `enable row level security` +
  policies** or the Data/REST API can't see them.
- **Svelte 5 runes** is the target idiom. Match the style of the file you're editing.

## Codex runtime notes

- Use pnpm only.
- On Windows/Codex, prefer Corepack pnpm:
  `corepack pnpm <command>`, or run `corepack enable` and
  `corepack prepare pnpm@<repo-version> --activate`.
- Do not use bundled pnpm from Codex runtimes unless Corepack fails.
- Do not rebuild `node_modules` unless explicitly necessary.
- Worktrees may live outside the original repo writable root; avoid rerunning setup
  unless dependencies are missing.
- If a command fails due to PATH, sandbox, or runtime setup, summarize the failure
  once and continue with the known fallback.
- For implementation tasks, prefer repo docs and existing patterns over web search.
  Use web only for genuinely version-sensitive external behavior, and summarize the
  reason first.
- Keep progress updates brief. Do not narrate every command unless it changes the
  plan. Prefer a compact final summary with files changed, whether a migration was
  generated, tests run, failures/blockers, and follow-up risks.

## Delivery workflow

- `ROADMAP.md` is strategy, not a backlog. GitHub Issues define executable scope and
  acceptance criteria; the GitHub Project owns priority, agent assignment, and live
  status.
- Treat requests to "create/open/file an issue," "create a feature," "create a
  feature issue," or "add this to the backlog" as issue-authoring requests when no
  implementation behavior is requested. Read the matching `.github/ISSUE_TEMPLATE/`,
  inspect enough repository context to fill it accurately, evaluate the ADR
  requirement, and show the completed title/body and target repository before writing
  to GitHub. Create it only after explicit approval of that draft (or an explicit
  instruction to skip the preview), report the issue URL, and do not implement it
  unless implementation was also requested.
- Treat requests to "implement," "build," or "add" a feature as code work. Planned
  code work still requires a Ready issue; create and approve the issue first when one
  does not exist.
- Planned feature work starts from a Ready issue. One issue maps to one primary
  branch, worktree, and pull request.
- Use the trigger test in `docs/adr/README.md`. Security boundaries, persistent data
  models, cross-cutting patterns, hard-to-reverse infrastructure, and gameplay
  fairness changes require an ADR.
- Claude and Codex must use separate worktrees created from a freshly fetched
  `origin/master`. Never modify or clean another agent's worktree.
- **New worktrees start without the `.env*` files** — they are gitignored, so a
  fresh worktree cannot reach Supabase / The Odds API until they are copied from
  the main checkout. Run `scripts/new-worktree.ps1` (it creates the worktree,
  copies every `.env*` except `.env.example`, installs deps, and can launch dev),
  or copy them by hand. `.npmrc` is tracked, so it travels with the worktree.
- **Run a worktree's dev server without leaving your current repo** with pnpm's
  `-C`: `pnpm -C ..\sunday_bets-claude-124 run dev -- --port 5174`. Use a
  non-5173 port so it coexists with the main checkout's dev server (the `dev`
  script hardcodes 5173, and the trailing `--port` overrides it).
- Parallel issues must identify likely files. Serialize Supabase migration-ledger,
  generated-type, shared auth/RLS, dependency-lockfile, and CI changes unless an
  explicit integration order exists.
- Pull requests close their issue, link relevant ADRs, and list verification that
  actually ran. Confirm before every GitHub write.

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
- **CI only runs unit tests on PRs to `master`. Lint never runs in CI** — run
  `pnpm lint` and `pnpm check` yourself; green CI does not mean lint-clean.
  Playwright runs e2e against a local Supabase stack.
- `@typescript-eslint/no-explicit-any` is `error` under `src/lib` + `src/routes`
  (use real types); it is **off** for tests and `supabase/scripts/**`.

## Agent context packs

Targeted deep-reference for the areas agents most often get wrong. Each pack links
to canonical sources rather than copying them — see
[docs/agent-context/README.md](docs/agent-context/README.md) for the index and the
link-not-copy rule.

- [auth.md](docs/agent-context/auth.md) — cookie sessions, iOS PWA constraint,
  service-role vs anon, admin boundary
- [database.md](docs/agent-context/database.md) — migration flow, generated files,
  RLS/grants/pgTAP rules, PR review guidance (how to skip generated noise)
- [ui.md](docs/agent-context/ui.md) — vendored shadcn-svelte restrictions, Svelte 5
  runes, Tailwind 4, demo seed
- [testing.md](docs/agent-context/testing.md) — four test layers, CI gate, lint-not-in-CI
  gotcha, mock fragility

## Default agent roles (a default, not a hard rule)

The default split between Claude and Codex:

- **Claude**: shape issues and acceptance criteria; review diffs and architecture;
  write or edit shared planning/agent-instruction files (`AGENTS.md`, `WORKFLOW.md`,
  ADRs); pair on tricky integrations.
- **Codex**: implement scoped, Ready issues; produce minimal diffs; run verification
  commands and report results; generate migrations.

One writer + one reviewer per feature. Never both agents coding the same feature
concurrently — pick one and let the other review. This is a default pattern: override
it when the task clearly suits the other agent.

## Token & scope discipline

Start from the assigned issue and the files it names — don't open the whole repo to
find context. Use `grep` / `glob` before opening large files. Read the diff
(`git diff master...branch`) before reading full file contents during review.

Do **not** clean up surrounding code opportunistically. A bug fix touches the bug.
A migration touches `supabase/src/**`. Report scope pressure instead of absorbing it:
if the task requires changing something outside the stated scope, say so and wait
for confirmation before proceeding.

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

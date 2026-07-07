# Testing context pack

> See `AGENTS.md` § "Testing & CI" for the one-line summary. This pack owns the
> agent-facing rules for each test layer.

## Four layers

### 1. Unit — `pnpm test:unit`

- Framework: Vitest + jsdom.
- Location: `__tests__/` directories next to the code they cover.
- Scope: pure functions, domain rules (`src/lib/domain/`), isolated server utilities.
- **The only layer CI runs unconditionally on every PR to `master`** (`ci-tests.yml`'s
  `unit` job). Integration and pgTAP also run in CI, but only when their paths change
  (see their own sections below) — see "Lint and svelte-check in CI" below for the
  lint/`check`/build jobs that also gate every PR.
- Mock fragility: unit tests mock `fetch` without `headers` and stub `$env` with only
  the keys each spec needs. Server code that touches response headers or reads new env
  vars must be defensive or the specs break. See `recordUsage()` in
  `src/lib/server/odds.ts` for a prior example of this trap.

### 2. Integration — `pnpm test:integration`

- Framework: Vitest against a **live local Supabase** instance.
- Location: `tests/integration/`.
- Scope: server-side DB queries/commands, RLS enforcement, auth flows.
- **Requires Docker Desktop running and `npx supabase start` completed.**
  Check with `npx supabase status` before running. If Docker is not running, start
  it — don't skip the tests.
- Run after any change to `src/lib/server/db/` or `supabase/src/`.
- **Also runs in CI** (`ci-integration.yml`), path-filtered to `supabase/**`, `src/**`,
  `tests/integration/**` — a real red check on a PR touching those paths, not just a
  local-only signal.

### 3. pgTAP — `npx supabase test db`

- Framework: pgTAP (SQL-level assertions run inside Postgres).
- Location: `supabase/tests/`.
- Scope: RLS policies, grants, SQL functions, migration invariants.
- **Required for every database PR** — if you added a table, policy, or function,
  add a pgTAP test for it.
- Also requires Docker + local Supabase running.
- **Run one file** while iterating: `npx supabase test db supabase/tests/NNN_name.sql` —
  faster than the whole suite, and it sidesteps the suites whose count assertions fail
  local-only on a prod-seeded DB (e.g. `005_cron`). Do **not** run a pgTAP file with raw
  `psql -f`: pgTAP's functions aren't on the connection's search_path, so `plan()` errors
  and the aborted transaction cascades — the `supabase test db` harness installs them.
- **Also runs in CI** (`ci-pgtap.yml`), path-filtered to `supabase/**` — the
  `pgTap-result` gate job passes on either a real pass or a path-filtered skip, so a
  failure there is a genuine CI gate, not decoration.

### 4. E2E — `pnpm test:e2e`

- Framework: Playwright.
- Location: `tests/e2e/`.
- Scope: full user flows in a browser against a local Supabase stack.
- Seeded `auth.users` rows cannot password-login (they lack `auth.identities`).
  Create users via `supabase.auth.admin.createUser({ email, password, email_confirm: true })`.
- Clicks on reactive controls can land before hydration — wrap in
  `await expect(async () => { ... }).toPass()` retry blocks.
- Seeding must be idempotent.

The E2E suite is governed by five pillars. They exist because a red e2e run was
historically ignorable (the workflow runs on every PR but the full suite is not a
required check) and the suite was flaky and high-maintenance. The pillars make
core flows a hard gate and keep the rest stable and cheap to maintain.

#### Pillar 1 — Selector discipline: anchor on `data-testid`, not copy

E2E specs used to break every time a feature PR tweaked UI copy, because they
asserted on literal strings (`'0/1 saved'`, `getByText('committed pick')`). To
keep specs stable:

- **Address chrome through `data-testid` anchors**, not visible text. A copy or
  markup change should not require touching a spec. Reserve text/role assertions
  for cases where the _content itself_ is what's under test (team abbreviations,
  spread values — real fixture data, not chrome).
- **Put the locators in a page object** under `tests/e2e/helpers/` (see
  `helpers/picks-board.ts` and `helpers/leaderboard-page.ts` for the pattern).
  Specs call the helper; the helper owns the testids. When the UI changes, you
  fix one file, not ten specs.
- **Testid naming**: kebab-case, scoped to the feature
  (`game-card`, `saved-counter`, `weight-item-${code}`, `committed-row`,
  `edit-pick`). Add testids to the stable structural anchors a flow needs, not to
  every element.
- The shadcn wrappers (`Button`, `ToggleGroupItem`, `Card`, `Tabs*`, …) forward
  `...restProps`, so a `data-testid` on the component lands on the DOM element.
- **If you change a route/flow that an e2e spec covers, update its spec (and any
  testids it needs) in the same PR** — don't leave it for a follow-up.

#### Pillar 2 — Test isolation & data hygiene

Auto-save and other write paths persist server-side, so a test can see rows a
previous test left behind. The once-only global clear in `global-setup.ts` only
protects whichever test runs first.

- **Every spec resets the mutable data it touches in `beforeEach`** — no spec may
  depend on another's leftover DB state or on the order tests run in.
- **Use the shared service-role helper** `tests/e2e/helpers/seed.ts`:
  `makeServiceClient()` builds the RLS-bypassing client (throws if the local
  env is missing); `resolveSeededGameId()` / `resetPicksForGame()` look up and
  reset the seeded fixtures. Don't rebuild `createClient(...)` inline in a spec.
- A spec that seeds its own fixtures (a past game, an isolated group, extra
  users) still owns its `beforeAll`/`afterAll` teardown — keep it idempotent.

#### Pillar 3 — Deterministic runner

- **CI serves a built `vite preview`, not the dev server** (`playwright.config.ts`
  switches on `process.env.CI`: `pnpm build && pnpm preview` on port 4173 in CI,
  `pnpm dev` on 5173 locally). This removes the Vite dep-optimize cold-start flake
  class, which is why CI retries are down to 1.
- The CI `webServer.timeout` is raised because the cold `vite build` runs inside
  the webServer command before `vite preview` answers the health check.
- `pnpm build` cannot complete locally on Windows (adapter-vercel EPERM), so the
  preview path is validated by CI, not locally — run the suite against `pnpm dev`
  locally.

#### Pillar 4 — CI gating (smoke required / full informational)

`.github/workflows/playwright.yml` runs two jobs:

- **`smoke`** — only `@smoke`-tagged core flows (`pnpm exec playwright test --grep
@smoke`). This is the check meant to be **required** in branch protection: a red
  core flow blocks merge. Keep it small (~5–6 tests) and fast.
- **`full`** — every spec, as an **informational** (non-required) safety net, so
  deep-flow flake is visible without blocking merges.

Tag a test with Playwright's tag API:
`test('…', { tag: '@smoke' }, async ({ page }) => { … })`. The current smoke set
covers password sign-in, the core picks write path, the leaderboard, the stats
page, and active-member routing. Marking the `smoke` check "required" is a GitHub
branch-protection setting, not a workflow flag.

#### Pillar 5 — Triage & maintenance

- Traces are captured `on-first-retry`, screenshots `only-on-failure`; the HTML
  report uploads as the `playwright-report-{smoke,full}` artifact for triage.
- **Authoring checklist** when you add or change a route/flow an e2e spec covers:
  1. Add `data-testid` anchors to the structural elements the flow needs and put
     the locators in a page object under `tests/e2e/helpers/`.
  2. Reset any mutable data the spec touches in `beforeEach` via `helpers/seed.ts`.
  3. If it is a core flow, tag one test `@smoke` (and keep the smoke set lean).
  4. Update the covering spec (and its testids) in the **same PR** as the change.

## Lint and svelte-check in CI

On PRs to `master`, `ci-tests.yml` runs three jobs: a `lint` job (which runs both
`pnpm run lint` and `pnpm run check`), a `unit` job (`pnpm run test:unit`), and a
`build` job (`pnpm run build`). Lint and svelte-check are therefore **enforced in
CI** — a lint or type error blocks the PR.

Still run both locally before pushing so you catch failures without a CI round-trip:

```sh
pnpm lint    # Prettier + ESLint
pnpm check   # svelte-check (type-checks .svelte files)
```

## TypeScript strictness

`@typescript-eslint/no-explicit-any` is `error` under `src/lib/` and `src/routes/`.
Use real types. The rule is **off** for test files and `supabase/scripts/**`.

## When to run which layer

| Change                             | Layers to run                                |
| ---------------------------------- | -------------------------------------------- |
| Pure logic, domain rules           | unit                                         |
| Server queries/commands, RLS       | integration + pgTAP                          |
| New table, policy, or SQL function | pgTAP (required) + integration               |
| UI component or route              | unit + e2e (manual if Playwright not set up) |
| Auth flow                          | integration + e2e                            |
| Any PR                             | `pnpm lint` + `pnpm check` always            |

## Validation snippet

```sh
pnpm lint && pnpm check && pnpm test:unit
# then, if database changed:
npx supabase test db
pnpm test:integration
```

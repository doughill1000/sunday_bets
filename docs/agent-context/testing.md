# Testing context pack

> See `AGENTS.md` § "Testing & CI" for the one-line summary. This pack owns the
> agent-facing rules for each test layer.

## Four layers

### 1. Unit — `pnpm test:unit`

- Framework: Vitest + jsdom.
- Location: `__tests__/` directories next to the code they cover.
- Scope: pure functions, domain rules (`src/lib/domain/`), isolated server utilities.
- **This is the only layer CI runs on PRs to `master`.**
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

### 3. pgTAP — `npx supabase test db`

- Framework: pgTAP (SQL-level assertions run inside Postgres).
- Location: `supabase/tests/`.
- Scope: RLS policies, grants, SQL functions, migration invariants.
- **Required for every database PR** — if you added a table, policy, or function,
  add a pgTAP test for it.
- Also requires Docker + local Supabase running.

### 4. E2E — `pnpm test:e2e`

- Framework: Playwright.
- Location: `tests/e2e/`.
- Scope: full user flows in a browser against a local Supabase stack.
- Seeded `auth.users` rows cannot password-login (they lack `auth.identities`).
  Create users via `supabase.auth.admin.createUser({ email, password, email_confirm: true })`.
- Clicks on reactive controls can land before hydration — wrap in
  `await expect(async () => { ... }).toPass()` retry blocks.
- Seeding must be idempotent.

#### Selectors: anchor on `data-testid`, not copy

E2E specs used to break every time a feature PR tweaked UI copy, because they
asserted on literal strings (`'0/1 saved'`, `getByText('committed pick')`). To
keep specs stable:

- **Address chrome through `data-testid` anchors**, not visible text. A copy or
  markup change should not require touching a spec. Reserve text/role assertions
  for cases where the _content itself_ is what's under test (team abbreviations,
  spread values — real fixture data, not chrome).
- **Put the locators in a page object** under `tests/e2e/helpers/` (see
  `helpers/picks-board.ts` for the pattern). Specs call the helper; the helper
  owns the testids. When the UI changes, you fix one file, not ten specs.
- **Testid naming**: kebab-case, scoped to the feature
  (`game-card`, `saved-counter`, `weight-item-${code}`, `committed-row`,
  `edit-pick`). Add testids to the stable structural anchors a flow needs, not to
  every element.
- The shadcn wrappers (`Button`, `ToggleGroupItem`, `Card`, …) forward
  `...restProps`, so a `data-testid` on the component lands on the DOM element.
- **If you change a route/flow that an e2e spec covers, update its spec (and any
  testids it needs) in the same PR** — don't leave it for a follow-up.

## Lint is not in CI

**CI only runs unit tests. Lint never runs in CI.** Always run both locally before a PR:

```sh
pnpm lint    # Prettier + ESLint
pnpm check   # svelte-check (type-checks .svelte files)
```

Green CI on a PR does not mean lint-clean. A PR with lint failures will be returned.

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

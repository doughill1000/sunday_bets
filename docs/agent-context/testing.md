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

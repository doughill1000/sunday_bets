---
name: test-gate
description: Pick and run the right local checks before opening a PR — lint + check + unit always, pgTAP + integration for DB/server changes, e2e for routes/auth — plus the recurring test-fixture gotchas. Use before raising a PR or when deciding which test layers a change needs.
---

# Pre-PR test gate

**Lint, `check`, and unit all gate every PR to `master`** (`ci-tests.yml`); pgTAP and
integration also run in CI, but only when their paths change (`ci-pgtap.yml`,
`ci-integration.yml` — skip-tolerant, so a real failure there is a genuine gate, not
decoration). Run this gate locally anyway — it's minutes faster than a CI round-trip,
not a coverage gap CI leaves open. Canonical: `docs/agent-context/testing.md` and
`AGENTS.md` §"Testing & CI".

## Always

```sh
pnpm lint      # Prettier + ESLint
pnpm check     # svelte-check (type-checks .svelte)
pnpm test:unit # Vitest + jsdom
```

## Conditional layers (by what changed)

| Change                                | Add                                              |
| ------------------------------------- | ------------------------------------------------ |
| `supabase/src` or `src/lib/server/db` | `npx supabase test db` + `pnpm test:integration` |
| New table / policy / SQL function     | `npx supabase test db` (required) + integration  |
| Route or auth flow                    | `pnpm test:e2e`                                  |

Integration/pgTAP/e2e need Docker + local Supabase — check `npx supabase status`
first; if it's not up, start it (don't skip the tests).

## Fixture gotchas (the recurring rework causes — self-check when touching tests)

- **Matchup-unique:** pgTAP and integration fixtures must use unique matchup keys, or
  they collide with the normalized matchup index.
- **Seeded `auth.users` can't password-login** (they lack `auth.identities`) — create
  users via `supabase.auth.admin.createUser({ email, password, email_confirm: true })`.
- **Idempotent + order-independent:** seeding must be re-runnable and must not depend
  on test execution order (seed prerequisites in each spec's own `beforeAll`).
- **Group tenancy:** seed group membership for any path that reads group-scoped data.
- **Unit mock fragility:** unit tests mock `fetch` without `headers` and stub `$env`
  with only the keys each spec needs — server code touching response headers or new
  env vars must be defensive (see `recordUsage()` in `src/lib/server/odds.ts`).

## See also

- `docs/agent-context/testing.md` — four layers, decision table, mock fragility
- Sibling skill `finish-pr` records which of these actually ran.

# Sunday Bets

A private NFL pick'em app for friends. Each week everyone picks winners against
the spread, weights each pick (Low = 1, Medium = 3, High = 5, or one All-In = 10
per week), and picks lock at kickoff. Games and FanDuel spreads come from
[The Odds API](https://the-odds-api.com/); graded results feed weekly and season
leaderboards.

**Stack:** SvelteKit 2 / Svelte 5 · Supabase (Postgres + Auth + RLS) ·
Tailwind 4 + shadcn-svelte · PWA (vite-plugin-pwa) · Sentry · Vercel.

## Local setup

Prereqs: Node 22+, [pnpm](https://pnpm.io), Docker Desktop,
[Supabase CLI](https://supabase.com/docs/guides/cli) (also installed as a dev dep).

```sh
pnpm install
cp .env.example .env          # fill in values; see comments in the file
npx supabase start            # local Postgres + Auth on docker
pnpm db:reset:local           # apply migrations, then clone data from prod
pnpm dev                      # http://localhost:5173
```

`pnpm db:types` regenerates `src/lib/types/supabase.ts` from the local DB.

## Tests

| Command                    | What it runs                                                         |
| -------------------------- | -------------------------------------------------------------------- |
| `pnpm test:unit`           | Vitest unit tests (`src/**/__tests__`), jsdom                        |
| `pnpm test:integration`    | Vitest against the **running local Supabase** (`tests/integration/`) |
| `npx supabase test db`     | pgTAP tests (`supabase/tests/`)                                      |
| `pnpm test:e2e`            | Playwright (`tests/e2e/`)                                            |
| `pnpm lint` / `pnpm check` | prettier + eslint / svelte-check                                     |

## Database & migrations

SQL sources live under `supabase/src/` (`schemas/`, `views/`, `functions/`,
`policies/`, ...). **Never edit `supabase/migrations/` by hand.** Instead:

1. Edit the relevant file under `supabase/src/`.
2. Run `pnpm db:migration --name=describe_the_change`. The generator
   (`supabase/scripts/generate-migration.ts`) hashes every source file against
   `supabase/.migration-hash.json` and writes one timestamped migration
   containing only the changed files. The ledger records the migration filename
   and content hash.
3. Commit the source change, the migration, and the ledger **together**.
4. `pnpm db:push:local` to apply locally (also regenerates types).

`pnpm db:migration:check` is read-only. It verifies that source hashes match the
ledger, linked migrations still exist with their original contents, and no source
files were silently deleted or moved. CI runs this before migration dry-runs and
production deploys.

Caveats of the hash-ledger approach:

- Don't rename, move, or delete files under `supabase/src/` casually. The generator
  rejects stale ledger entries. Object removal needs explicit `DROP` SQL before its
  ledger entry is intentionally removed.
- `create table if not exists` does not alter an existing table. Schema evolution
  needs explicit, idempotent `alter table` SQL in a new logically named source file;
  changing only the original `create table` statement is insufficient.
- New source files may define only one primary table, type, view, or function. The
  generator enforces this and only grandfathers the unchanged legacy bundles.
  Policies and grants may remain grouped as table-scoped access contracts. Function
  signature changes are safest with an explicit
  `-- @signature: schema.function(argument_types)` header.
- `--bootstrap` stamps current hashes without writing a migration; only use it
  when the DB already matches the sources. A missing or malformed ledger otherwise
  fails closed.

## Deploys

- **App:** Vercel deploys on push via its Git integration (adapter-vercel).
- **Database:** pushing changes under `supabase/**` to `master` deploys to prod
  after a `pg_dump` backup to OneDrive. PRs get source-integrity and
  `supabase db push --dry-run` checks. See
  `.github/workflows/migrate-db.yml` and `migrate-dry-run.yml`.

PRs target `master`; `master` is production.

Note: `pnpm build` on Windows fails in the final adapter-vercel packaging step
(symlinks need elevation/Developer Mode). The Vite build itself completing is
enough to validate changes locally; real builds happen on Vercel.

## Operations (currently manual, automation planned — see ROADMAP.md)

Admins trigger from the `/admin` page:

- **Sync odds** — pulls the active week's games + FanDuel spreads
  (`/api/admin/sync-odds`). Usage is metered against
  `settings.odds_api_monthly_cap`.
- **Grade** — refreshes final scores and settles picks
  (`/api/admin/grade-game|grade-week|grade-season`).

See `ROADMAP.md` for the feature/automation plan.

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

Trunk-based: `master` is the single long-lived branch and production. Feature work
happens on short-lived branches that PR into `master`; there is no `develop` branch.

- **App:** Vercel deploys `master` to production on push (adapter-vercel). Every PR
  gets a **preview deployment** backed by the **staging** Supabase project, which
  replaces a shared staging environment.
- **Database:** pushing changes under `supabase/**` to `master` deploys to prod
  (after a `pg_dump` backup to OneDrive). PRs get a source-integrity check plus a
  `supabase db push --dry-run` against prod. See `.github/workflows/migrate-db.yml`
  and `migrate-dry-run.yml`.
- **Staging DB:** kept as a recent prod mirror via `pnpm db:clone:dev`. Most PRs
  need nothing extra; for a PR that changes `supabase/**` and whose preview should
  exercise the new schema, run `pnpm db:push:dev` first (then clone-reset after).

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

## Push notifications

Web push (VAPID, no third-party service) for pick reminders and line-movement
alerts. See `ROADMAP.md` Phase 4.

- **Setup:** generate a keypair with `npx web-push generate-vapid-keys`, then set
  `PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` (see
  `.env.example`) in Vercel (Production + Preview) and the GitHub Actions
  Production environment.
- **Users** enable notifications and tune the line-shift threshold on `/settings`.
  iOS requires 16.4+ **and** the app installed to the Home Screen.
- **Triggers:** an hourly, kickoff-driven `pregame` cron (`/api/cron/pregame`)
  reminds about unpicked games ~2–3h before kickoff and — when a game is within
  ~6h — refreshes odds and fires line-movement alerts (within 24h of kickoff,
  capped to once per pick per day). It self-gates the Odds API call to game-day
  hours. The daily `sync-odds` cron still runs Tue–Sat to keep UI lines fresh.
  Admins can send a test from `/admin`.
- Subscriptions live in `push_subscriptions`; `notification_log` records sends
  for audit + dedupe. Per-user prefs are stored in `users.notification_prefs`.

See `ROADMAP.md` for the feature/automation plan.

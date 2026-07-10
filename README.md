# Hotshot

A private NFL pick'em app for friends. Each week everyone picks winners against
the spread, weights each pick (Low = 1, Medium = 3, High = 5, or one All-In = 10
per week), and picks lock at kickoff. Games and FanDuel spreads come from
[The Odds API](https://the-odds-api.com/); graded results feed weekly and season
leaderboards.

**Stack:** SvelteKit 2 / Svelte 5 · Supabase (Postgres + Auth + RLS) ·
Tailwind 4 + shadcn-svelte · PWA (vite-plugin-pwa) · Sentry · Vercel.

## Planning and delivery

- [ROADMAP.md](ROADMAP.md) describes product direction and release order.
- GitHub Issues and the repository Project track executable work, ownership, and
  status.
- [Architecture Decision Records](docs/adr/README.md) capture durable architecture
  and gameplay-fairness decisions.
- [The delivery workflow](docs/WORKFLOW.md) defines issue readiness, ADR timing,
  worktrees, parallel-agent coordination, pull requests, and releases.

Claude and Codex work from separate issue-scoped worktrees created from the latest
`origin/master`; they never share a checkout.

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

### Demo data for UI work

`db:reset:local` clones **production**, whose games are all in the past — so during
the offseason there is no active week and the "open picks before kickoff" screens
never render. To inspect every UI state locally, seed synthetic, **date-anchored**
data instead:

```sh
npx supabase start
pnpm db:reset:demo            # reset migrations + seed demo data (alternative to db:reset:local)
pnpm dev                      # http://localhost:5173
```

`db:reset:demo` builds one active week (with a mix of open, selected, locked, and
missed picks) plus 3 prior fully-graded weeks, across 6 players, so the picks,
leaderboard, and admin screens are all populated. Re-run just the data with
`pnpm db:seed:demo` (idempotent). All 6 accounts log in with password `password`:

| Email               | Player  | Role   |
| ------------------- | ------- | ------ |
| `admin@example.com` | Doug    | admin  |
| `test2@example.com` | Hank    | player |
| `test3@example.com` | Charlie | player |
| `demo4@example.com` | Marcus  | player |
| `demo5@example.com` | Beth    | player |
| `demo6@example.com` | Mike    | player |

Log in as `admin@example.com` to also see the `/admin` screen and a showcase picks
board (committed, missed, a current selection, and open cards with All-In available).

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

- **App:** Vercel's automatic Git deploys are **disabled** (`vercel.json`
  `git.deploymentEnabled: false`). Deploys run through GitHub Actions instead, which
  keeps daily deployment creations under Vercel's Hobby cap of 100/day (ADR-0010):
  - **Production** (`deploy-prod.yml`) deploys only via a manual **Run workflow**
    (`workflow_dispatch`) — there is no push-triggered path. That single dispatch runs
    the whole release in order: migration-ledger check → prod DB backup → apply
    pending migrations → build & deploy → tag the `v<version>` GitHub Release (read
    from `package.json` at dispatch time). **A plain merge to `master` never ships** —
    someone must run the workflow to release (see ADR-0010's amendment).
  - **Previews** (`deploy-preview.yml`) deploy **purely on demand**, via a `/preview`
    PR comment from an authorized author — nothing fires automatically on PR open,
    ready, reopen, or push. Previews use Vercel's Preview env (backed by the
    **staging** Supabase project) and the URL is posted back as a PR comment.
- **Database:** migrations apply to prod only as part of the manual `deploy-prod.yml`
  release (after a `pg_dump` backup to OneDrive, before the app deploy — see
  `.github/workflows/deploy-prod.yml` and ADR-0010). A merge to `master` never touches
  prod's schema by itself. PRs still get a source-integrity check plus a
  `supabase db push --dry-run` against prod via `migrate-dry-run.yml`.
- **Backups:** Supabase's Free tier has **no managed backups**, so a scheduled workflow
  (`cron-backup.yml`) dumps prod off-platform to OneDrive (rclone) weekly — flip to daily
  at season start — pruning dumps older than 90 days. The pre-release snapshot above and
  this scheduled job share the `.github/actions/backup-supabase-db` composite action
  (ADR-0010). Locally, `pnpm db:backup:prod` runs the same dump on demand.
- **Staging DB:** `.github/workflows/clone-to-staging.yml` pushes migrations and
  clones prod's data into staging automatically once `deploy-prod.yml` completes
  successfully, so staging never runs ahead of (or behind) the released prod schema.
  It can also be run on demand via **Run workflow**, or locally with
  `pnpm db:clone:dev`. For a PR that changes `supabase/**` and whose preview should
  exercise the new schema before a release, run `pnpm db:push:dev` first (then
  clone-reset after).

The deploy workflows authenticate with the Vercel CLI via three GitHub secrets —
`VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` (the org/project IDs come from
`.vercel/project.json` after `vercel link`). They must exist before `vercel.json`
lands, because once auto-deploys are off the workflows are the only way to ship. All
other build config (Supabase, VAPID, …) is pulled from the Vercel project's
Production/Preview environments by `vercel pull`, so it is not duplicated in GitHub.

PRs target `master`; `master` is production.

Note: `pnpm build` on Windows fails in the final adapter-vercel packaging step
(symlinks need elevation/Developer Mode). The Vite build itself completing is
enough to validate changes locally; real builds happen on Vercel.

## Roadmap and project tracking

The [Hotshot GitHub Project](https://github.com/users/doughill1000/projects/1)
is the working backlog for planned features, architecture work, and parked cleanup.
Project items use the `Status` field to track delivery and the `Agent` field to show
who owns the next action.

`ROADMAP.md` remains the longer-form product and technical plan: it records phase
goals, version targets, dependencies, design decisions, and acceptance details.
Use the GitHub Project for day-to-day prioritization and progress; update the roadmap
when the underlying plan or sequencing changes.

## Operations (currently manual, automation planned — see ROADMAP.md)

Admins trigger from the `/admin` page:

- **Sync odds** — pulls the active week's games + FanDuel spreads
  (`/api/admin/sync-odds`). Usage is metered against
  `settings.odds_api_monthly_cap`.
- **Grade** — refreshes final scores and settles picks
  (`/api/admin/grade-game|grade-week|grade-season`).

GitHub Actions also calls `CRON_SECRET`-protected endpoints for scheduled odds sync,
grading, week rollover, pregame notifications, and monthly quota reset. See
`.github/workflows/` for active schedules.

## Push notifications

Web push (VAPID, no third-party service) for pick reminders and line-movement
alerts.

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

See `ROADMAP.md` for product direction.

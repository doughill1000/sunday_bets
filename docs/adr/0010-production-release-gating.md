# ADR-0010: Gate deploys behind version bumps via GitHub Actions

- Status: Accepted (amended 2026-06-27, 2026-07-09)
- Date: 2026-06-26
- Issue: None (approved release-strategy plan; no tracking issue)
- Supersedes: None

## Amendment (2026-07-09): previews purely on demand

Dropped the automatic preview on PR open/ready-for-review/reopen. `deploy-preview.yml`
now triggers only on an `issue_comment` carrying `/preview` from an authorized author
(`OWNER`/`MEMBER`/`COLLABORATOR`) — nothing deploys a preview automatically at any
point in a PR's lifecycle. Point 3 of the original Decision and the Consequences below
should be read with "one preview when a PR is opened, marked ready, or reopened" struck.

Why: the per-PR-open preview was still automatic noise against the same Hobby
deployment-count cap this ADR exists to manage, and in practice reviewers reach for
`/preview` explicitly when they actually need a URL rather than relying on the
auto-created one.

## Amendment (2026-06-27): one fully-manual release that migrates _and_ deploys

The original decision made a `package.json` `version` change on a push to `master`
**auto-deploy** to production (with `workflow_dispatch` as a secondary path), and let
`migrate-db.yml` **auto-apply** migrations to prod on any push to `master` that touched
`supabase/**`. Both automatic triggers are **removed**. Production is now released by a
single deliberate `workflow_dispatch` on `.github/workflows/deploy-prod.yml`. A merge to
`master` — version bump or schema change or not — never touches production by itself.

That one dispatch runs the whole release in order:
`source_integrity` (migration ledger check) → `backup` (pre-release prod DB dump to
OneDrive) → `migrate` (`supabase db push`, idempotent no-op if nothing is pending) →
`deploy` (`vercel pull → build --prod → deploy --prebuilt --prod`) → tag the
`v<version>` GitHub Release. Migrations run **before** the deploy so the DB and app ship
together — this directly closes the "prod database can run ahead of the deployed prod
app" gap called out in the Consequences below. `migrate-db.yml` is **deleted** (its jobs
moved into `deploy-prod.yml`); `migrate-dry-run.yml` is unchanged and still validates
every migration via `supabase db push --dry-run` against Production at PR time, so a bad
migration is caught before it can reach a release.

What stays the same: previews, `git.deploymentEnabled: false`, the runtime-secret
constraints below, and the backup/migration mechanics themselves. The `v<version>` tag +
GitHub Release step still runs (now on every manual dispatch, reading the current
`package.json` `version`, skipping if the tag already exists), so the milestone → Release
ritual is unchanged.

Why: "every version-bump merge ships to prod" coupled releasing to merging, and
auto-migrate-on-merge applied schema to prod ahead of (and independently of) the app.
Folding both into one manual release makes the release moment explicit, ships schema and
app together, and lets changes land on `master` without forcing a production cut. Where
the decision text below says a version bump is the production-release _signal_, read it
as: a version bump marks a release _candidate_; the manual dispatch is the release.

## Context

The app deployed through Vercel's **default Git integration** (there was no
`vercel.json`). Every merge to `master` created a **production** deployment and every
push to any PR branch created a **preview** deployment. With one maintainer running
two coding agents (Claude and Codex) across many PRs — each with many pushes — this
routinely exceeded Vercel's **Hobby plan cap of 100 deployments per day**.

The cap counts **deployment creations**, not builds. The obvious lever — a Vercel
"Ignored Build Step" (`ignoreCommand`) that exits non-zero unless `package.json`
`version` changed — does **not** help: a skipped build still **creates a counted
deployment**. Confirmed against Vercel's git-configuration docs and community
guidance. The only setting that prevents a deployment from being _created_ (and thus
from counting) is `git.deploymentEnabled: false`.

Most of the daily count comes from previews (many PRs × many pushes), so reducing
both production and preview creations is required to get under the cap.

## Decision

Move the deploy pipeline out of Vercel's Git integration and drive it explicitly from
GitHub Actions, which is free for this repo.

1. **Disable Vercel automatic Git deploys** via `vercel.json`:
   `{ "git": { "deploymentEnabled": false } }`. Vercel now only creates a deployment
   when the Vercel CLI is invoked.
2. **Production deploys only on a deliberate release** — a `package.json` `version`
   change on a push to `master`, or a manual `workflow_dispatch` (off-cycle cut).
   `.github/workflows/deploy-prod.yml` compares the version at `HEAD` vs `HEAD^` and
   runs `vercel pull --environment=production` → `vercel build --prod` →
   `vercel deploy --prebuilt --prod` only when it changed. On a version-bump deploy it
   also creates the `v<version>` tag + GitHub Release, tying into the existing
   milestone → Release ritual.
3. **Previews are deliberate, not per-push** — one preview when a PR is opened, marked
   ready, or reopened (drafts skipped), plus on demand via a `/preview` comment from an
   authorized author (`OWNER`/`MEMBER`/`COLLABORATOR`).
   `.github/workflows/deploy-preview.yml` runs
   `vercel pull --environment=preview` → `vercel build` →
   `vercel deploy --prebuilt` and posts the URL as a PR comment.

`vercel pull` fetches the env vars already configured in the Vercel project's
Production / Preview environments (Supabase, VAPID, etc.), so builds get correct
config without duplicating secrets in GitHub. The only new GitHub secrets are
`VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`.

**Server secrets are read at runtime, not inlined at build:** because `vercel build`
now runs on the GitHub runner — and **Sensitive** Vercel vars cannot be downloaded by
`vercel pull` — server-only secrets must be read at _runtime_ via
`$env/dynamic/private`, read _lazily_ (inside the consuming function, or behind a
singleton/`Proxy`), and **never** via `$env/static/private`, which SvelteKit inlines
at build time. A build-inlined secret crashes SvelteKit's post-build `analyse` step
(it imports server modules, which throw when the secret is absent) and would bake the
secret into the prebuilt artifact uploaded from the runner. Modules that follow this:
`src/lib/server/push.ts`, `src/lib/supabase/service.ts`, `src/lib/server/odds.ts`, and
`src/lib/server/cron.ts`. (Public, non-secret config may still use `$env/static/public`.)

**Boundary future work must preserve:** a version bump is the production-release
signal. App changes that must ship together with a merged schema change should bump
`package.json` `version` in that same PR so app and DB ship together.

## Consequences

Helpful:

- Daily deployment count drops to roughly (releases) + (PRs opened) + (explicit
  `/preview`s), comfortably under 100/day.
- Production releases become intentional and self-documenting: a version bump is the
  release, and it auto-tags a GitHub Release.
- Installed PWAs refresh per release rather than on every merge (content-hash service
  worker + `registerType: 'autoUpdate'`).

Harmful / costs:

- `vercel.json` is now the single point of failure for deploys: if its secrets are
  missing or the workflows break, **nothing deploys**. The secrets must exist before
  this lands (the merge itself will not auto-deploy).
- A merge to `master` no longer updates production by itself; whoever merges must bump
  the version (or run the manual dispatch) to actually ship.
- Because `migrate-db.yml` still runs on push to `master`, the **prod database can run
  ahead of the deployed prod app** between releases. This is safe for the repo's
  additive/idempotent migration style but must be kept in mind.
- Slightly slower feedback: a preview is no longer produced on every push, so a
  `/preview` comment is needed for an updated preview mid-PR.

## Alternatives considered

- **`ignoreCommand` / Ignored Build Step keyed on the version bump.** Rejected: a
  skipped build still creates a counted deployment, so it does not relieve a
  deployment-_count_ cap. (This was the initially chosen direction, reversed after
  confirming the counting behavior.)
- **Upgrade to a paid Vercel plan.** Rejected for now: the deployment volume is
  almost entirely automation noise, not real release demand; gating removes the noise
  at $0.
- **Keep auto-production-on-merge, gate previews only.** Rejected: production deploys
  alone (one per merge across an active multi-agent workflow) plus previews still risk
  the cap, and "every merge ships to prod" is undesirable independent of the cap.

## Follow-up

- One-time setup: add `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` to GitHub,
  then run the prod workflow once via **Run workflow** to establish the baseline
  production deployment under the new pipeline.
- Revisit if release cadence rises enough that manual version bumps become friction
  (e.g. automate the bump), or if a paid plan is adopted for other reasons.
- Optionally pass `package.json` `version` as the Sentry release for nicer
  release-health grouping (currently auto-tagged by git commit).

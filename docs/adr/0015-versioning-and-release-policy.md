# ADR-0015: Versioning and release policy (label-driven SemVer)

- Status: Proposed
- Date: 2026-06-27
- Issue: #265
- Supersedes: None

## Context

The app already versions with SemVer (`package.json`), names milestones `vX`, and
auto-tags a `v<version>` GitHub Release at deploy time. What is missing is a **rule
for how the number is chosen** and a **place in the workflow where that choice is
captured**:

- Nothing defines what makes a change major, minor, or patch. `AGENTS.md` only says
  "if the issue includes a target version number, bump it" — but never says how that
  number is decided.
- `issue-author` never assigns a milestone, so version intent is not recorded when the
  work is defined (most open issues are unmilestoned).
- There is a read-only `release-status` skill but no write counterpart that actually
  cuts a release.
- ADR-0010's amendment made production a single manual `workflow_dispatch` (the version
  is only _read_ at dispatch to tag the Release), and its follow-up explicitly lists
  "automate the bump" as future work — this ADR resolves that.

The goal: decide a change's version impact **once**, at authoring, carry it through the
pipeline, and **compute** the release version from it — with no new dependencies and no
change to the existing date-grouped changelog.

## Decision

**1. SemVer mapping for this app.**

- **major** — removes or renames a user-facing capability, makes a breaking
  data-model or auth change that requires coordinated migration, or marks an epoch
  shift (single-group → multi-group was `2.0`).
- **minor** — a new, backward-compatible user-facing feature or capability (most
  `type:feature` work).
- **patch** — bug fix, performance, refactor, infra/CI, docs, or chore — no new
  user-facing capability. **Default** when no label is present, for issue-less PRs,
  and for ADR-only (`type:decision`) PRs that ship no code.

**2. `semver:` label is the durable carrier of version intent.** `issue-author`
assigns one of `semver:patch` / `semver:minor` / `semver:major` plus a **target
milestone** (the version the work is slated for) and surfaces both in the draft for
approval. `finish-pr` inherits them onto the PR; for an issue-less PR it applies
`semver:patch` and attaches the active milestone.

**3. The version is computed at release, not bumped per PR.** Feature PRs do **not**
touch `package.json`. `cut-release` computes the release version as
`bump(base, level)` where `base` is the highest existing `v*` git tag (the last
shipped version) and `level` is the highest `semver:` label across the milestone's
issues and any issue-less PRs merged since `base` (major > minor > patch; default
patch). It writes the new version into `package.json` in a dedicated release PR.

**4. `package.json` holds the last shipped version between releases.** This replaces
the prior "pre-bump to the next version" convention; `release-status` is updated to
match. Because the version is computed from the latest `v*` tag, the policy is robust
regardless of the current `package.json` value during the transition.

**5. The changelog stays date-grouped; GitHub Releases are the per-version notes.**
`docs/CHANGELOG.md` keeps its atomic-in-PR, newest-first, `## YYYY-MM-DD` format
unchanged. The per-version view comes from the auto-generated `v<version>` GitHub
Release that the manual `deploy-prod` dispatch already creates (ADR-0010).

**Boundaries to preserve:** one milestone = one release; the manual `workflow_dispatch`
remains the release moment (ADR-0010, not superseded here); GitHub Releases remain the
authoritative shipped history.

## Consequences

Helpful:

- Version numbers become **derived and predictable**, not guessed.
- Roadmap → version → issue traceability is restored at authoring time (every issue
  carries a milestone + impact).
- Releasing becomes a repeatable `cut-release` ritual rather than ad-hoc steps.
- Resolves ADR-0010's "automate the bump" follow-up with **zero new dependencies** and
  no change to the changelog format.

Harmful / costs:

- Relies on label discipline at authoring. A missing label defaults to `patch`, which
  can under-bump; mitigated by `finish-pr` confirming/inheriting the label and by
  `cut-release` re-deriving from the milestone before cutting.
- Changes the `package.json` convention (now last-shipped, not pre-bumped), requiring
  the one-line `release-status` note update.
- Existing open issues need a one-time retro-labeling pass.

## Alternatives considered

- **Changesets (`@changesets/cli`).** Industry standard; auto-computes the bump and a
  version-grouped changelog. Rejected for now: it adds a dependency oriented to npm
  publishing and would replace the liked atomic, date-grouped `docs/CHANGELOG.md`.
- **Conventional-commit automation (release-please / semantic-release).** Derives the
  bump from commit prefixes via a bot/Action. Rejected: adds a bot and leans on strict
  per-commit discipline; a label on the issue carries intent more legibly for an
  agent-driven workflow.
- **Status quo (ad-hoc version numbers).** Rejected — it is the problem this ADR fixes.

## Follow-up

- #265 implements this (ADR + `cut-release` skill + `issue-author`/`finish-pr`/
  `release-status` edits + `AGENTS.md`/`WORKFLOW.md` doc-drift fixes + `semver:*`
  labels).
- Optionally pass `package.json` `version` as the Sentry release for release-health
  grouping (also noted in ADR-0010's follow-up).
- Revisit toward Changesets / release-please if release cadence rises enough that
  manual `cut-release` becomes friction.

# ADR-0038: PR merge-gate model — the `-result` wrapper contract and required-check names as an interface

- Status: Accepted
- Date: 2026-07-22
- Issue: #751
- Supersedes: None

## Context

Nothing documents which CI checks are required to merge a PR, or the pattern that makes
a path-filtered CI job usable as a required check at all. ADR-0010 governs _deploy_
gating (version bumps, the manual prod dispatch); the PR merge gate is a separate,
undocumented layer.

GitHub repo rulesets match required status checks **by job name**. Several CI jobs are
intentionally path-filtered — `unit`/`build` skip on docs-only PRs, `pgTap` skips when
`supabase/**` is untouched, `integration` skips when `supabase/**`, `src/**`, and
`tests/integration/**` are untouched, `verify`/`supabase-dry-run` skip when the
migration ledger is untouched. A workflow trigger filtered on `paths:` never runs at
all for a PR outside those paths — no status is ever posted, so a required check
pointed straight at the job's name sits `Expected` forever and blocks the merge
indefinitely.

**This already failed, expensively and silently.** Before PR #709 (v3.8.0),
`ci-integration.yml` triggered on `paths:` at the workflow level, so `integration` never
ran for most PRs and could never actually be required — the ruleset's `integration`
entry sat `Expected` with no way to resolve. PR #709 fixed it by moving the path filter
inside the workflow (trigger on every PR, gate the `integration` job internally via
`dorny/paths-filter`) and adding an `integration-result` wrapper job that reports
`success` whenever the underlying job is `success` or `skipped`, mirroring the pattern
`ci-tests.yml` (`unit-result`/`build-result`), `ci-pgtap.yml` (`pgTap-result`),
`migrate-dry-run.yml` (`dry-run-result`), and `ci-migration-verify.yml`
(`verify-result`) already used. A required check that can never resolve is
indistinguishable from a passing one until someone goes looking.

## Decision

Adopt the following as the repo's PR merge-gate model.

**The `-result` wrapper-job contract.** Any workflow job that backs a required status
check and is gated by a `paths:` filter (workflow-trigger level or an internal
`detect-changes`/`dorny/paths-filter` step) must expose a wrapper job:

- `needs: <job>`, `if: always()`
- Passes (`exit 0`) when the underlying job's result is `success` **or** `skipped`
- Fails (`exit 1`) on any other result (`failure`, `cancelled`, `timed_out`)

The wrapper's name — not the underlying job's — is what the ruleset requires. A
required check that is never path-filtered at the trigger level (e.g. `lint`,
`governance`) needs no wrapper; its own job name is stable and always reports.

Current wrappers: `unit-result`, `build-result` (`ci-tests.yml`), `pgTap-result`
(`ci-pgtap.yml`), `integration-result` (`ci-integration.yml`), `dry-run-result`
(`migrate-dry-run.yml`), `verify-result` (`ci-migration-verify.yml`), `smoke-result`
(`playwright.yml`).

**Required-check names are a stable interface.** They are matched by string name from a
GitHub repo ruleset (`Master`, id 17616524) stored outside this repository — nothing in
the repo enumerates them authoritatively apart from this ADR. Renaming a wrapper job, or
a job that itself is required and unfiltered, is a merge-gate change and must be paired
with updating the ruleset; it is not a refactor to make casually.

**Core vs informational.** Required (hard-gate) checks: `lint`, `governance`,
`unit-result`, `build-result`, `smoke-result`, `pgTap-result`, `integration-result`,
`dry-run-result`, `verify-result`. `pgTap-result`/`integration-result`/`dry-run-result`/
`verify-result` gate in practice only when their underlying paths change — they pass
trivially (via the `skipped` branch) otherwise. `playwright.yml`'s `full` job (every
spec, not just `@smoke`) is deliberately **informational, not required** — it runs the
same preview-backed suite as `smoke` but is a slower, more flake-prone safety net; a
red `full` run is visible without blocking merge. This is a latency/cost tradeoff:
`smoke` keeps the hard gate fast, `full` catches deep-flow regressions asynchronously.

**Convention for new CI jobs.** Adding a path-filtered job that should gate merges means
adding its `-result` wrapper in the same PR, and updating the ruleset's required-check
list to point at the wrapper name, not the job.

## Consequences

- **Helpful:** the PR #709 failure mode (a required check that can never resolve) has a
  written guard and a name contributors and agents can search for; `ci-triage` and
  `test-gate` gain something to cite when a check is stuck `Expected`; the out-of-repo
  ruleset coupling is now on record instead of tribal knowledge.
- **Costs:** this ADR describes CI, which changes faster than most ADR subjects. It is
  written at the contract/principle level (the wrapper pattern, the stable-name rule,
  the core/informational split) rather than enumerating every job, so it should not need
  amendment every time a workflow file changes — only when the _model_ changes.
- **Migration/rollback:** none. Docs-only; no workflow or ruleset changes are made by
  this ADR.

## Alternatives considered

1. **No ADR — leave it in workflow YAML.** Zero cost, but the convention stays
   inferable only by reading several workflow files side by side, and the PR #709 class
   of failure stays available to every new path-filtered job.
2. **Document it in `docs/agent-context/testing.md` only.** Cheaper than an ADR, and
   that pack already documents the surrounding "five pillars" (selector discipline, test
   isolation, the smoke/full split). But it's guidance for writing tests, not a durable
   record of a merge-gate boundary, and it wouldn't capture the ruleset coupling as a
   decision with consequences. Rejected as insufficient given the demonstrated cost of
   getting this wrong (PR #709) and the "hard-to-reverse infrastructure" trigger this
   meets.
3. **A CI self-check that asserts the ruleset's required names still exist as jobs.**
   Strictly better enforcement than documentation alone, but it needs the ruleset via
   the GitHub API and is a real build, not a docs change. Named below as an authorized
   follow-up rather than a prerequisite to this ADR.

## Follow-up

- A CI or governance self-check that reads the `Master` ruleset's required-check list
  via the GitHub API and asserts each name still corresponds to a job that reports on
  every PR (either unfiltered, or a `-result` wrapper) — would have caught the PR #709
  gap automatically. Not built here; authorized as follow-up work if picked up.
- `docs/agent-context/testing.md` could gain a cross-link to this ADR alongside its
  five-pillars section, since the smoke/full split and the wrapper contract are two
  sides of the same gate.

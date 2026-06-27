---
name: issue-author
description: Author a GitHub issue from a natural-language request — when Doug asks to create/open/file an issue, create a feature/feature issue, or add something to the backlog with no implementation requested. Pick the template, fill it from repo context, run the ADR trigger test, draft for approval, then create.
---

# Author an issue

Triggered when the request is **issue-authoring, not implementation**: "create / open /
file an issue", "create a feature / feature issue", "add this to the backlog", with no
implementation behavior requested. Canonical: `docs/WORKFLOW.md` §"Natural-language
issue requests" and `AGENTS.md` §"Delivery workflow".

## Steps

1. Choose the matching template under `.github/ISSUE_TEMPLATE/`:
   `feature.yml`, `bug.yml`, or `decision.yml`.
2. Inspect enough repository context to fill the template credibly — likely files,
   constraints, dependencies/integration order, a verification plan appropriate to the
   risk, and the **ADR decision** (run the trigger test in `docs/adr/README.md`).
3. **Set version intent** (ADR-0015): assign a **target milestone** (the version the
   work is slated for — the current open roadmap milestone, or a named future one) and
   a **`semver:patch|minor|major`** label per the SemVer mapping in
   `docs/adr/0015-versioning-and-release-policy.md` (major = removed/breaking/epoch
   shift · minor = new user-facing feature · patch = fix/perf/infra/docs/chore). The
   label is the durable carrier of version impact that `cut-release` later consumes.
4. A Ready issue has: one independently mergeable outcome + explicit exclusions;
   observable acceptance criteria; resolved dependencies or a documented integration
   order; an ADR link / governing ADR / credible reason none is needed; likely paths
   and shared-or-generated ownership called out; a target milestone and `semver:` label.
5. **Present the completed title + body + the target milestone + `semver:` label + the
   exact target repo** and wait for explicit approval before writing. A direct "skip the
   preview and create it" counts as approval.
6. Create via `gh` (apply the milestone and `semver:` label on creation), report the
   issue URL, and **stop** — do not implement unless implementation was also requested
   (then hand off to `start-issue`).

## See also

- `docs/WORKFLOW.md` §"From idea to Ready", §"ADR timing", and §"Versioning"
- `docs/adr/0015-versioning-and-release-policy.md` (the `semver:` label policy)
- Sibling skills: `new-adr` (if the trigger test requires one), `start-issue`,
  `cut-release` (consumes the `semver:` labels at release time).

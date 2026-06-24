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
3. A Ready issue has: one independently mergeable outcome + explicit exclusions;
   observable acceptance criteria; resolved dependencies or a documented integration
   order; an ADR link / governing ADR / credible reason none is needed; likely paths
   and shared-or-generated ownership called out.
4. **Present the completed title + body + the exact target repo** and wait for explicit
   approval before writing. A direct "skip the preview and create it" counts as approval.
5. Create via `gh`, report the issue URL, and **stop** — do not implement unless
   implementation was also requested (then hand off to `start-issue`).

## See also

- `docs/WORKFLOW.md` §"From idea to Ready" and §"ADR timing"
- Sibling skills: `new-adr` (if the trigger test requires one), `start-issue`.

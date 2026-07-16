---
name: new-adr
description: Decide whether a decision needs an ADR via the trigger test, then scaffold the next-numbered ADR from the template. Use for security boundaries, persistent data models, cross-cutting patterns, hard-to-reverse infrastructure, or gameplay-fairness changes.
---

# New ADR

ADRs record durable technical and fairness decisions. Canonical: `docs/adr/README.md`
(trigger test) and `docs/WORKFLOW.md` §"ADR timing".

## Steps

1. **Run the trigger test** in `docs/adr/README.md`. An ADR is required for security
   boundaries, persistent data models, cross-cutting patterns, hard-to-reverse
   infrastructure, and gameplay-fairness changes. If it does not apply, say so and stop.
2. Scaffold the next number: copy `docs/adr/0000-template.md` to
   `docs/adr/NNNN-short-slug.md` (check the directory for the current max — ADRs are
   sequential, e.g. after `0006` the next is `0007`). Fill in context, decision,
   and consequences.
3. **Timing** (`docs/WORKFLOW.md` §"ADR timing"):
   - High-risk / foundational → merge an **ADR-only PR before** implementation.
   - Bounded decision → a **Proposed** ADR may travel with the implementation PR, but
     resolve material design feedback before the change becomes costly to reverse.
   - Accepted ADRs are superseded, not silently rewritten.

## Remember

- **After creating or editing any ADR file, run `pnpm format` then `pnpm lint`
  before committing** — prettier reflows ADR markdown, and the CI lint job fails on
  unformatted output.

## See also

- `docs/adr/README.md` — trigger test and index
- Sibling skills: `issue-author` (records the ADR decision on the issue), `start-issue`.

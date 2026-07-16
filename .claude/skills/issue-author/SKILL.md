---
name: issue-author
description: Author a GitHub issue from a natural-language request — when Doug asks to create/open/file an issue, create a feature/feature issue, or add something to the backlog with no implementation requested. Pick the template, fill it from repo context, run the ADR trigger test, offer a design study for non-trivial UI features, then create it directly (issue creation is pre-authorized — no draft-approval gate).
---

# Author an issue

Triggered when the request is **issue-authoring, not implementation**: "create / open /
file an issue", "create a feature / feature issue", "add this to the backlog", with no
implementation behavior requested. Canonical: `docs/WORKFLOW.md` §"Natural-language
issue requests" and `AGENTS.md` §"Delivery workflow".

## Steps

0. **Unvetted-bet gate.** If this is a **product bet nobody has vetted** — a new
   feature idea arriving as "add this to the backlog" with no prior pressure-test,
   design study, or roadmap grounding — offer to run `pressure-test` first (it slots
   before this skill and returns a Build/Reshape/Drop verdict). Skip the offer for
   bugs, chores, follow-ups split from existing work, or ideas Doug has already vetted.
1. Choose the matching template under `.github/ISSUE_TEMPLATE/`:
   `feature.yml`, `bug.yml`, or `decision.yml`.
2. Inspect enough repository context to fill the template credibly — likely files,
   constraints, dependencies/integration order, a verification plan appropriate to the
   risk, and the **ADR decision** (run the trigger test in `docs/adr/README.md`).
3. **UI-study gate.** If the issue introduces a **non-trivial UI surface** — a new or
   reworked screen/route, a multi-screen or multi-step flow, a significant new component, or
   an information-architecture change — flag it and **offer a design study** (the
   `design-study` skill) _before_ drafting the body. **Skip the offer** for bug fixes,
   copy/label tweaks, single-property style changes, small additive tweaks to an existing
   component, and backend-only work — the gate is for complex UI workflows, not small ones.
   If Doug wants one, run `design-study`, then fold its artifact link and conclusions into
   the issue's UX/design notes and acceptance criteria so the visual argument is settled
   before the issue is Ready. If he declines, note that and carry on.
4. **Set version intent** (ADR-0015): assign a **target milestone** (the version the
   work is slated for — the current open roadmap milestone, or a named future one) and
   a **`semver:patch|minor|major`** label per the SemVer mapping in
   `docs/adr/0015-versioning-and-release-policy.md` (major = removed/breaking/epoch
   shift · minor = new user-facing feature · patch = fix/perf/infra/docs/chore). The
   label is the durable carrier of version impact that `cut-release` later consumes.
5. A Ready issue has: one independently mergeable outcome + explicit exclusions;
   observable acceptance criteria; resolved dependencies or a documented integration
   order; an ADR link / governing ADR / credible reason none is needed; likely paths
   and shared-or-generated ownership called out; a target milestone and `semver:` label
   (plus a design-study link if one was produced).
6. **Finalize** the title, body, target milestone, `semver:` label, and the exact
   target repo. Issue creation is **pre-authorized** (see user `CLAUDE.md`
   §"GitHub Access") — do **not** present a draft or wait for approval; proceed
   straight to creating it.
7. Create via `gh` (apply the milestone and `semver:` label on creation), then **add the
   new issue to the Project board at `Status: Backlog`** so nothing Ready is ever missing
   from the board (the `gh` token carries `project` scope):

   ```powershell
   $itemId = (gh project item-add 1 --owner doughill1000 --url <issue-url> --format json |
     ConvertFrom-Json).id
   gh project item-edit --id $itemId --project-id PVT_kwHOAGAfqM4BbXA1 `
     --field-id PVTSSF_lAHOAGAfqM4BbXA1zhWIDLs --single-select-option-id 72968049
   ```

   Set **only** `Status: Backlog`. The `Agent`, `Priority`, `Area`, and `Risk` fields are
   human-triage calls (`docs/WORKFLOW.md` §"Claim and isolate work") — leave them unset. The
   Project/field/option ids are this repo's Project #1 (Status field
   `PVTSSF_lAHOAGAfqM4BbXA1zhWIDLs`, Backlog option `72968049`); re-derive with
   `gh project field-list 1 --owner doughill1000` if the Project is ever recreated.

   Report the issue URL. For **complex, multi-decision** work, offer to run `scope-issue` next (an
   interview that settles essential vs nice-to-have and splits off follow-ups) before any
   implementation — skip the offer for small or already-unambiguous issues. `scope-issue`
   carries its own **Model & effort** note (run scoping on Opus/high); flag that when you
   offer it if the current session is on a lighter model. Then **stop** —
   do not implement unless implementation was also requested (then hand off to `start-issue`).

## See also

- `docs/WORKFLOW.md` §"From idea to Ready", §"ADR timing", and §"Versioning"
- `docs/adr/0015-versioning-and-release-policy.md` (the `semver:` label policy)
- Sibling skills: `pressure-test` (settle whether an unvetted product bet is worth
  building — runs before this skill), `design-study` (visual proposal for a non-trivial
  UI feature — the UI-study gate), `scope-issue` (interview to triage essential vs
  nice-to-have for complex work), `new-adr` (if the trigger test requires one),
  `start-issue`, `cut-release` (consumes the `semver:` labels at release time).

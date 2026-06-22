# Architecture Decision Records

ADRs capture decisions that would otherwise be rediscovered from code or old pull
requests. They explain why a durable choice was made, its tradeoffs, and how a later
decision may replace it.

## When an ADR is required

Create an ADR when a change does any of the following:

- changes authentication, authorization, RLS, or another trust boundary;
- introduces or replaces a persistent data model, external service, framework, or
  cross-cutting application pattern;
- changes gameplay fairness or scoring semantics;
- creates a constraint that will affect multiple future features; or
- is costly, risky, or operationally difficult to reverse.

An ADR is normally unnecessary for a local implementation detail, dependency patch,
small bug fix, or a choice already governed by an accepted ADR.

When uncertain, note the decision in the issue and ask during triage. Do not create
an ADR merely to restate the implementation.

## Lifecycle

1. Copy `0000-template.md` to the next available four-digit number and a short
   kebab-case title.
2. Set the status to `Proposed`, link the driving issue, and open it with or before
   the implementation PR.
3. Resolve material design feedback before implementation becomes hard to unwind.
4. Set the status to `Accepted` when maintainers approve the decision.
5. Do not rewrite an accepted decision to match new reality. Add a new ADR with
   `Supersedes: ADR-NNNN` and mark the old record `Superseded by ADR-NNNN`.

Allowed statuses are `Proposed`, `Accepted`, `Rejected`, and
`Superseded by ADR-NNNN`. Typo and link corrections do not require supersession.

## Index

| ADR                                                 | Decision                        | Status   |
| --------------------------------------------------- | ------------------------------- | -------- |
| [ADR-0001](0001-use-issue-led-delivery-and-adrs.md) | Use issue-led delivery and ADRs | Accepted |

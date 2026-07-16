---
name: scope-issue
description: Interview Doug to scope an existing GitHub issue before implementation — research the issue intent and its ADRs, ground questions in real code, then ask structured questions to settle essential vs nice-to-have. Use when Doug wants to scope/triage an issue, clarify requirements, or "interview me" about an issue — not to author a new issue (issue-author) or jump straight to coding (start-issue).
---

# Scope an issue by interview

Triggered when Doug points at an **existing** issue and wants to settle what to build
before implementation: "scope #NNN", "interview me about #NNN", "essential vs nice-to-have
for this issue", "what's actually in scope here". The output is a triaged plan, not code.
Slots between `issue-author` / `new-adr` and `start-issue`. Canonical: `docs/WORKFLOW.md`.

The interview earns its keep on what the issue leaves **open** — not on decisions the
governing ADR already settled. Read those, then interview around them.

> **Model & effort.** Scoping a complex, multi-decision issue is the judgment-heavy
> stage — run it on **Opus with high thinking effort**. A skill can't switch the
> session's model, so this is advisory: if the current session is on a lighter model,
> the scope will be shallower than intended. Fast/mechanical issues don't need the
> interview at all (skip straight to `start-issue`), so if you're here, assume the
> heavier setting is warranted.

## Steps

1. **Read the intent fully.** `gh issue view NNN` — Outcome, Scope (Included/Excluded),
   Acceptance criteria, Dependencies. Read every governing/linked ADR under `docs/adr/`;
   it usually already fixes the trust/data/fairness decisions, so don't reopen them. Check
   the **status of each dependency issue** (`gh issue view`) — open deps change sequencing
   and what is actually buildable now.
2. **Ground the questions in real code first.** Never interview in the abstract. Find the
   schema / policies / routes / helpers / tests the issue touches and the existing patterns
   to reuse, so every option names real files, columns, and gaps. Note the **current-state
   gaps** the issue must fill (e.g. a missing DELETE policy, an ungranted column). Prefer
   reusing what exists over proposing new code.
3. **Find the genuine gray areas** — the only things worth asking about:
   - product/UX choices the "Included" scope leaves open (page placement, what a row shows,
     which states render);
   - acceptance criteria that **imply an action not in the explicit list** (e.g. a guard AC
     implying a demote action);
   - anything whose answer changes sequencing or **removes/adds a dependency**.
     For everything a default or the ADR already settles, pick the obvious option and just
     state it — don't ask.
4. **Interview with `AskUserQuestion`.** Lead with the highest-leverage decisions. Give a
   recommendation (first option, "(Recommended)"). Use `preview` ASCII mockups for
   layout/IA/UI choices so Doug can compare side by side. When the open questions are
   substantially **visual** — a new/reworked screen, a multi-screen flow, an IA change —
   a `design-study` (before/after mockups in the app's real skin) settles them better than
   ASCII previews; offer one before or instead of interviewing that slice. Use `multiSelect`
   for "pick everything that's MVP-essential." Keep rounds tight (≈2–4 questions); one short
   follow-up round to close loose ends is fine — don't over-interview.
5. **Triage and surface consequences.** Turn the answers into an explicit **Essential vs
   Nice-to-have** table, and call out the scope/dependency consequences a choice creates
   (e.g. deferring a sub-feature removed a dependency or unblocked the issue). Recommend
   issue hygiene — update Included/Excluded, split a deferred piece into a follow-up issue,
   drop a stale `blocked` label — but treat these as GitHub writes.
6. **Produce the plan, post on request.** Write the concrete plan by layer, naming real
   files and reused helpers with a verification section. If Doug asks, post it to the issue
   (`gh issue comment --body-file`). Then hand off to `start-issue`.

## Remember

- The ADR is the source of truth for settled trust/data/fairness decisions — interview
  around them, never re-litigate them.
- Don't ask what a sensible default or the codebase already answers; ask only what changes
  what gets built.
- Every option must be grounded in real code — no abstract questions.
- **Confirm before any GitHub write** (comment, label change, issue edit).

## See also

- `docs/WORKFLOW.md` §"From idea to Ready" and §"ADR timing"
- Sibling skills: `issue-author` (creates the issue), `design-study` (before/after mockups
  when the open questions are visual), `new-adr` (if a decision needs one), `start-issue`
  (begins implementation).

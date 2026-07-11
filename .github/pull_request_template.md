## Issue

Closes #

## Outcome

Describe the user or operational result, not just the files changed.

## Decision record

- ADR: ADR-NNNN / governed by ADR-NNNN / not required because ...
- Material deviation from the issue or ADR: None / explain

## Scope

- Included:
- Deliberately excluded:

## Verification

- [ ] `pnpm lint`
- [ ] `pnpm check`
- [ ] Focused tests: `...`
- [ ] Additional integration, pgTAP, e2e, or manual checks: `...`

List commands that actually ran and explain any skipped check.

## Coordination

- [ ] This work used its own issue, branch, and worktree.
- [ ] The branch started from a current `origin/master`.
- [ ] Known file overlap and merge ordering are documented below, or there is none.

Overlap / ordering notes:

## Design checklist

Delete this section when no user-facing UI changed. See `docs/DESIGN.md` (ADR-0030).

- [ ] Nothing clips horizontally at 390px; wide content scrolls in its own container.
- [ ] No disclosure is nested inside another disclosure.
- [ ] "Switch a cut" uses the chip radiogroup, not a second control.
- [ ] Colours/type/spacing come from tokens (the brand-color guard passes).
- [ ] The primary action is visually dominant; committed vs uncommitted state is unmistakable.
- [ ] Loading / empty / error / stale states are designed and keep the layout's hierarchy.
- [ ] Consequential actions give immediate feedback **and** a durable confirmation.
- [ ] Muted/body text clears AA; interactive controls have visible focus, semantic roles, and keyboard operation.
- [ ] Motion respects `prefers-reduced-motion` and uses the motion tokens.

## Database checklist

Delete this section when no database source changed.

- [ ] Edited `supabase/src/**`, not generated migrations by hand.
- [ ] Generated the migration with `pnpm db:migration --name=...`.
- [ ] Included the SQL source, migration, and hash ledger together.
- [ ] Regenerated Supabase types when the exposed schema changed.
- [ ] Added explicit grants, RLS, policies, and permission tests where applicable.

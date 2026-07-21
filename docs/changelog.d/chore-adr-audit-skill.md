- **PR #747** ADR governance layer — add the `adr-audit` skill (periodic fan-out pass that
  grades the ADR corpus itself for drift, the twin of `pattern-audit`/`product-audit`), give
  `finish-pr` a step to update a linked ADR's Follow-up in the same PR that ships the work,
  and close the blind spot that let `Issue: None` ADRs sit `Proposed` indefinitely — the
  freshness gate now ages out any long-`Proposed` ADR, not just ones with a linked issue.
  files: `.claude/skills/adr-audit/` · `.claude/skills/finish-pr/` ·
  `scripts/check-governance-freshness.ts`

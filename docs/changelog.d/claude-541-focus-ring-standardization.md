- **#541** Focus-ring standardization + avatar-picker semantics — the remaining
  hand-written controls (native season/scope selects, the weight toggle, picks
  Clear-pick/Unlock buttons, a vendored tab panel) now use the canonical
  `focus-visible` ring instead of `focus:` or a bare `outline-none`; the settings
  avatar picker gained `role="radiogroup"`/`aria-checked` and roving-tabindex arrow
  navigation. Governed by ADR-0029 (`docs/agent-context/design-system.md`), no new
  ADR.

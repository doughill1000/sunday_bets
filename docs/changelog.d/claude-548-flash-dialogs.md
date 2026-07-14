- **#548** Rebuild RecapFlash/WrappedFlash on the vendored Dialog/Sheet — replaces the two
  hand-rolled overlays with real modal semantics (focus trap, Escape, no suppressed a11y
  warnings) and fixes the vendored dialog's edge-to-edge width at 390px. Wrapped's seen-once
  state moves server-side (mirroring RecapFlash's `#302` marker), which also fixes `/wrapped`
  double-rendering itself under the old localStorage flash. adr: ADR-0030 · tables:
  `wrapped_seen` · routes: `/api/wrapped/mark-seen` · files: `RecapFlash.svelte` ·
  `WrappedFlash.svelte` · `dialog-content.svelte`

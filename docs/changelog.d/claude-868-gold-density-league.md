- **#868** Ranked the competing golds on `/league`, which read as one flat gold field. The
  page-level tab's selected state is now a brass outline over a wash instead of a solid
  brass slab, so a gold _fill_ means "actionable" and a gold _outline_ means "selected"
  (DESIGN.md P5); the demo banner's "New here?" orientation link drops its gold for neutral
  ink with a resting underline, leaving the sign-up button as the demo chrome's only gold
  call to action. The tab treatment is shared, so it lands on `/league`, `/wrapped` and both
  demo mirrors at once; `src/lib/ui/tabs.ts` · `DemoBanner.svelte` ·
  `docs/agent-context/design-system.md` (the gold weight ladder is now written down).

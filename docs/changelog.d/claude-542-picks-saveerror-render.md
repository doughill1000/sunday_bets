- **#542** Render the picks partial-apply save warning — a multi-group member whose
  lock only applied to some groups now sees a durable, screen-reader-announced note on
  the committed pick instead of the signal vanishing with the card's exit animation.
  Reuses `FormNote` (ADR-0030 principle 10). files: `src/lib/components/picks/LockedPicksSection.svelte`

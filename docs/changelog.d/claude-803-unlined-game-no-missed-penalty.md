- **#803** A game nobody could pick no longer costs anybody points. If a game reaches kickoff
  with no betting line for your league's book, picking it is impossible — but grading still
  charged every member the missed-pick penalty for skipping it, which would have wrecked
  standings during an odds-feed outage. Grading now skips such a game entirely, and the
  week-completeness check agrees so nothing is left stranded as ungraded. Games that did have a
  line penalize non-pickers exactly as before, and no existing results change. adr:
  `docs/adr/0040-unpickable-games-cannot-cost-points.md`

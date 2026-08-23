- **#833** `/demo` follows the new IA — the frozen mid-Sunday sweat moved to `/demo/week`, where
  the live board and the per-game pick cards now render off the committed snapshot, while `/demo`
  keeps the picking board and the handoff strip. The demo derives that breakdown from the fixture
  it already had rather than storing a second copy, and the drift guard now fails if `/demo`
  regrows a post-kickoff row or either demo screen reaches for the live feed. A frozen board also
  stopped reading its state off the wall clock, so the demo's one still-open game no longer reads
  as a missed pick once its kickoff timestamp ages into the past. Governed by ADR-0026 (amended).
  `src/routes/demo/week/` · `src/lib/server/demo/liveWeek.ts` · `docs/adr/0026-*.md`

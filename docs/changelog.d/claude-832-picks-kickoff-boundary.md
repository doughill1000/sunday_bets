- **#832** Kickoff is now a hard boundary on `/picks`: the board holds only the games you can
  still act on — unpicked cards and locked-but-not-started picks, still unlockable — and a game
  that has kicked off leaves the page entirely for a single server-rendered handoff strip to
  `/week` (in play · final · missed · settled points). The duplicated live sweat layer, the
  revealed group picks and the per-game comment UI go with it, so `/picks` issues no live-feed
  call in any state and its load no longer waterfalls on comments. Reverses #386's split (Week
  became its own nav tab in #776) and closes #823 by removal. Comments are switched off, not
  removed — table, RLS, API route and #689's reactions repoint are untouched. files:
  `src/lib/components/picks/` · `src/routes/(app)/picks/+page.server.ts` · `docs/DESIGN.md`
  (decision note) · ADR-0030

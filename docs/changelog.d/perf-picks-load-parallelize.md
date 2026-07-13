- **PR #592** Speed up the `/picks` page load: drop a redundant display-name query (the
  name already rides the cached auth profile), stop re-resolving the active week a second
  time, and overlap the comments/reactions fetch with the other per-week reads. Cuts the
  load's critical path from five serial database round-trips to roughly two parallel waves,
  trimming PWA tab-switch latency into Picks. No behaviour change. file:
  `src/routes/(app)/picks/+page.server.ts`

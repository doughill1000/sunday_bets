- **#602** Client-query data loading (ADR-0033), first slice — added the load-classification
  inventory (`docs/client-query-inventory.md`) covering every app route, then migrated
  `/recap` to the pattern: recap prose + weekly hardware/shelf now load via a cached
  `createQuery` keyed by `(groupId, season)` against a new `/api/recap` endpoint, matching
  the existing Stats/Group/Leaderboard convention (ADR-0017). Remaining routes (Wrapped,
  Picks) are cataloged in the inventory as follow-up PRs.

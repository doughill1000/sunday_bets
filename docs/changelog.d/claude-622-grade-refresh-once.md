- **#622** Grade cron runs the global post-grade refreshes once — the leaderboard/stats matview
  refresh and the credibility-ratings rebuild are now hoisted into a single `refreshReadModels()`
  call after all weeks (recent + reconcile) settle, instead of racing once per `gradeWeek`. Fixes a
  transient empty `player_ratings` and the doubled matview refresh; the ratings prune is also made
  concurrency-safe (deletes strictly-older stamps, never `!= T`). files: grading.ts ·
  rating/rebuild.ts · api/cron/grade · ADR-0013 / ADR-0032

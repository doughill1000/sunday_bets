- **#744** Stop the grade cron from re-grading a finished season's final week on every
  tick. The prior-week candidate had no end condition, so once a season finished the
  cron kept re-settling the same picks and rewriting settlement timestamps for months —
  harmless to scoring, but noisy and misleading. The cron now drops that candidate once
  it has no grading work left; a just-concluded week that isn't fully final and settled
  yet is still picked up, and still runs its recap/Wrapped/badge fan-out. The
  weekly-recap cron, which needs that same week returned just after it settles to fire
  its push, is unaffected. Trade-off: a settled prior week no longer auto-picks-up a
  late score correction; the existing reconcile sweep and manual grade endpoint remain
  available if that's ever needed. files: `findRecentGradableWeeks`.

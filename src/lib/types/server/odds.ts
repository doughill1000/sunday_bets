/** Write/skip tallies for one Odds API window. */
export type WeekSyncCounts = {
  count: number;
  totalGames: number;
  processed: number;
  unchanged: number;
  skippedNoTeams: number;
  skippedNoSpread: number;
  skippedNoMatchup: number;
};

/** Which slate a per-week result belongs to. */
export type WeekSyncRole = 'active' | 'upcoming';

/**
 * One week's outcome within a run. A run now covers two weeks (#801), which makes
 * the flat totals below ambiguous on their own — a `skippedNoMatchup` of 16 reads
 * very differently for the live slate than for a week still being primed. The
 * per-week breakdown is what keeps `cron_run_log` diagnosable, including for a
 * week that failed while the other succeeded.
 */
export type WeekSyncResult = { role: WeekSyncRole } & (
  | ({ ok: true; weekId: number; weekNumber: number } & WeekSyncCounts)
  | { ok: false; weekId: number | null; weekNumber: number | null; reason: string }
);

export type SyncStats = WeekSyncCounts & {
  ok: true;
  /** Per-week detail, in sync order; the fields above are its totals. */
  weeks: WeekSyncResult[];
};

export type SyncError = { ok: false; reason: string };

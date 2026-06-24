export type SyncStats = {
  ok: true;
  count: number;
  totalGames: number;
  processed: number;
  unchanged: number;
  skippedNoTeams: number;
  skippedNoSpread: number;
  skippedNoMatchup: number;
};

export type SyncError = { ok: false; reason: string };

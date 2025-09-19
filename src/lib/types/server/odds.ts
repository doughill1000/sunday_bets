export type SyncStats = {
  ok: true;
  count: number;         
  totalGames: number;           
  processed: number;           
  unchanged: number;            
  skippedNoTeams: number;
  skippedNoSpread: number;
};

export type SyncError = { ok: false; reason: string };
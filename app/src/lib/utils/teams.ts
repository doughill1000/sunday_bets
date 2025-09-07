import { TEAM_META, type TeamMeta } from '$lib/types/domain';

// Reverse index: by numeric id → the meta (plus abbr for convenience)
export const TEAM_BY_ID: Record<number, TeamMeta & { abbr: string }> = Object.fromEntries(
  Object.entries(TEAM_META).map(([abbr, meta]) => [meta.id, { ...meta, abbr }])
);

// Small helpers so UI code stays clean
export function teamByAbbr(abbr: string | null | undefined): TeamMeta | undefined {
  if (!abbr) return undefined;
  return TEAM_META[abbr];
}

export function teamById(id?: number | string | null): (TeamMeta & { abbr: string }) | undefined {
  if (id === null || id === undefined) return undefined;
  const n = typeof id === 'string' ? Number(id) : id;
  return TEAM_BY_ID[n];
}

export function teamNameById(id?: number | string | null): string | undefined {
  return teamById(id)?.name;
}

export function abbrById(id?: number | string | null): string | undefined {
  return teamById(id)?.abbr;
}

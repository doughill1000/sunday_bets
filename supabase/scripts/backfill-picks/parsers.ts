export type Weight = 'L' | 'M' | 'H' | 'A';

export const normalizeTeamCode = (s: string) => s.trim().toUpperCase();

export function toNum(v: any): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = String(v ?? '').trim();
  if (!s) return undefined;
  const m = s.match(/^[-+]?\d+(?:\.\d+)?$/);
  return m ? Number(s) : undefined;
}

export function parseWeightCell(raw: any): Weight | undefined {
  if (raw == null) return undefined;
  const s = String(raw).trim().toUpperCase();
  return s === 'L' || s === 'M' || s === 'H' || s === 'A' ? (s as Weight) : undefined;
}

// Wide layout helper: parse combined text like "PHI H -3.5", "Home A +1"
export function parsePickCell(raw: any): {
  weight?: Weight;
  pickedSide?: 'home' | 'away';
  teamCode?: string;
  lineValue?: number;
  lineTeamHint?: 'home' | 'away' | string;
} | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;

  const w = (s.match(/\b(A|H|M|L)\b/i)?.[1] ?? '').toUpperCase() as Weight | '';
  const side =
    /\bhome\b/i.test(s) || /\bH(?:ome)?\b/.test(s)
      ? 'home'
      : /\baway\b/i.test(s) || /\bA(?:way)?\b/.test(s)
        ? 'away'
        : undefined;

  const teamCode = (s.match(/\b([A-Z]{2,4})\b/)?.[1] ?? '').toUpperCase();
  const num = s.match(/[+-]\d+(?:\.\d+)?/);
  const lineValue = num ? Number(num[0]) : undefined;

  let lineTeamHint: 'home' | 'away' | string | undefined;
  if (/\bhome\b/i.test(s) || /\bH(?:ome)?\b/.test(s)) lineTeamHint = 'home';
  if (/\baway\b/i.test(s) || /\bA(?:way)?\b/.test(s)) lineTeamHint = 'away';
  if (teamCode) lineTeamHint = teamCode;

  return {
    weight: (w || undefined) as Weight | undefined,
    pickedSide: side,
    teamCode: teamCode || undefined,
    lineValue,
    lineTeamHint
  };
}

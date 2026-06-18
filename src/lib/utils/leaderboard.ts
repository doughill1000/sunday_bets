import type { ShortResult } from '$lib/constants/picks';
import type { GameResult } from '$lib/types/domain';

export const toResult = (o: GameResult | null | undefined): ShortResult =>
  o === 'win' ? 'W' : o === 'loss' ? 'L' : o === 'push' ? 'P' : 'M';

export function formatLockedSpread(
  lockedSpreadValue: number | null | undefined,
  lockedSpreadTeamId: number | string | null | undefined,
  pickedTeamId: number | string | null | undefined
): string | null {
  if (lockedSpreadValue == null) return null;
  const v = Number(lockedSpreadValue);
  if (!Number.isFinite(v)) return null;
  if (Math.abs(v) < 1e-9) return 'PK';
  const favoritePicked =
    lockedSpreadTeamId != null &&
    pickedTeamId != null &&
    String(lockedSpreadTeamId) === String(pickedTeamId);
  const mag = Math.abs(v);
  return favoritePicked ? `-${mag}` : `+${mag}`;
}

export const gameLabel = (awayShort?: string | null, homeShort?: string | null) =>
  `${awayShort ?? 'AWY'} @ ${homeShort ?? 'HOME'}`;

export function gameScore(finalScores: unknown): string | null {
  if (!finalScores || typeof finalScores !== 'object') return null;
  // @ts-expect-error jsonb shape
  const a = Number(finalScores?.away);
  // @ts-expect-error jsonb shape
  const h = Number(finalScores?.home);
  if (!Number.isFinite(a) || !Number.isFinite(h)) return null;
  return `${a}–${h}`; // away–home
}

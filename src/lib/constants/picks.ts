export type VerboseResult = 'win' | 'loss' | 'push' | 'missed';
export type ShortResult = 'W' | 'L' | 'P' | 'M';

export const RESULT_MAP: Record<VerboseResult, ShortResult> = {
  win: 'W',
  loss: 'L',
  push: 'P',
  missed: 'M'
};

// apps/web/src/lib/scoring.ts
export type WeightCode = 'L' | 'M' | 'H' | 'A';

export const WEIGHTS: Record<WeightCode, { label: string; points: number }> = {
  L: { label: 'Low',     points: 1 },
  M: { label: 'Medium',  points: 3 },
  H: { label: 'High',    points: 5 },
  A: { label: 'All-In',  points: 10 }
};

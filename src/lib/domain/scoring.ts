// Mirrors the per-weight points used by SQL grading (grade_pick / pick_settlement).
// Keep in sync with the DB scoring preset — see docs/adr/0007-line-and-lock-grading-preset.md.
import type { WeightCode } from '$lib/types/domain';

export const WEIGHTS: Record<WeightCode, { label: string; points: number }> = {
  L: { label: 'Low', points: 1 },
  M: { label: 'Medium', points: 3 },
  H: { label: 'High', points: 5 },
  A: { label: 'All-In', points: 10 }
};

export function weightLabel(weight: WeightCode): string {
  return WEIGHTS[weight].label;
}

export function weightPoints(weight: WeightCode): number {
  return WEIGHTS[weight].points;
}

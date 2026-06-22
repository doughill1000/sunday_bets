import { WEIGHTS, type WeightCode } from '$lib/types/domain';
import type { SeasonTrendEntry } from '$lib/types/server/stats';

export type TrendPoint = {
  week_number: number;
  cumulative_points: number;
};

export type TrendSeries = {
  userId: string;
  displayName: string;
  points: TrendPoint[];
};

export function buildTrendSeries(rows: SeasonTrendEntry[]): TrendSeries[] {
  const grouped = new Map<string, TrendSeries>();

  for (const row of rows) {
    const series = grouped.get(row.user_id) ?? {
      userId: row.user_id,
      displayName: row.display_name,
      points: []
    };
    series.points.push({
      week_number: row.week_number,
      cumulative_points: row.cumulative_points
    });
    grouped.set(row.user_id, series);
  }

  return [...grouped.values()]
    .map((series) => ({
      ...series,
      points: series.points.toSorted((a, b) => a.week_number - b.week_number)
    }))
    .toSorted((a, b) => a.displayName.localeCompare(b.displayName));
}

export function formatAccuracy(accuracy: number | null): string {
  return accuracy == null ? '--' : `${Math.round(accuracy * 100)}%`;
}

export function weightLabel(weight: WeightCode): string {
  return WEIGHTS[weight].label;
}

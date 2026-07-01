<script lang="ts">
  import { LineChart } from 'layerchart';
  import { buildTrendSeries } from '$lib/utils/stats';
  import type { SeasonTrendEntry } from '$lib/types/server/stats';

  interface Props {
    rows: SeasonTrendEntry[];
    showLegend?: boolean;
  }

  let { rows, showLegend = true }: Props = $props();

  const colors = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
    'var(--foreground)'
  ];

  const series = $derived(buildTrendSeries(rows));

  const chartSeries = $derived(
    series.map((s, index) => ({
      key: s.userId,
      label: s.displayName,
      data: s.points,
      color: colors[index % colors.length]
    }))
  );

  // The forgiven week for each player (ADR-0018): the raw cumulative line is untouched, so
  // we overlay a distinct ring on the dropped point via LineChart's `aboveMarks` slot, which
  // hands us the chart scales for exact positioning. layerchart has no per-point styling on
  // the high-level LineChart, so this overlay is the fallback the issue anticipated.
  const droppedMarkers = $derived(
    series.flatMap((s, index) =>
      s.points
        .filter((p) => p.is_dropped_week)
        .map((p) => ({
          key: `${s.userId}-${p.week_number}`,
          week_number: p.week_number,
          cumulative_points: p.cumulative_points,
          color: colors[index % colors.length]
        }))
    )
  );

  // Weeks are whole numbers, so force integer ticks instead of the linear
  // scale's auto-generated fractions (1.2, 1.4, …).
  const weekTicks = $derived(
    [...new Set(rows.map((r) => r.week_number))].toSorted((a, b) => a - b)
  );

  // layerchart's axis labels rely on a `fill-surface-content` class that our
  // Tailwind build doesn't generate (it skips node_modules), so the text falls
  // back to black. Setting the fill attribute directly skips that class.
  const tickLabelProps = { fill: 'var(--muted-foreground)' };
</script>

<div
  class="h-72 w-full sm:h-96"
  role="img"
  aria-label="Cumulative season points by week for each player"
  data-testid="season-trend-chart"
>
  <LineChart
    x="week_number"
    y="cumulative_points"
    series={chartSeries}
    points
    yDomain={null}
    props={{
      spline: { fill: 'none' },
      xAxis: { ticks: weekTicks, format: (value) => String(value), tickLabelProps },
      yAxis: { tickLabelProps }
    }}
  >
    <!-- Legacy named-slot interop: LineChart exposes the chart scales on `aboveMarks`,
         letting us position the dropped-week ring exactly on the raw cumulative line. -->
    <svelte:fragment slot="aboveMarks" let:xScale let:yScale>
      {#each droppedMarkers as marker (marker.key)}
        <circle
          cx={xScale(marker.week_number)}
          cy={yScale(marker.cumulative_points)}
          r="7"
          fill="none"
          stroke={marker.color}
          stroke-width="2.5"
        />
      {/each}
    </svelte:fragment>
  </LineChart>
</div>

{#if droppedMarkers.length > 0}
  <p class="mt-2 text-xs text-muted-foreground">
    <span aria-hidden="true">◯</span> Ringed week is the lowest week, dropped from the standings total
    only — the win-loss record still counts it.
  </p>
{/if}

{#if showLegend}
  <ul class="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm" aria-label="Chart legend">
    {#each chartSeries as series (series.key)}
      <li class="flex items-center gap-2">
        <span class="size-2.5 rounded-full" style:background-color={series.color} aria-hidden="true"
        ></span>
        <span>{series.label}</span>
      </li>
    {/each}
  </ul>
{/if}

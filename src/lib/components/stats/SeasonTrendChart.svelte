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

  const chartSeries = $derived(
    buildTrendSeries(rows).map((series, index) => ({
      key: series.userId,
      label: series.displayName,
      data: series.points,
      color: colors[index % colors.length]
    }))
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
  />
</div>

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

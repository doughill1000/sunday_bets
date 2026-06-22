<script lang="ts">
  import { LineChart } from 'layerchart';
  import { buildTrendSeries } from '$lib/utils/stats';
  import type { SeasonTrendEntry } from '$lib/types/server/stats';

  interface Props {
    rows: SeasonTrendEntry[];
  }

  let { rows }: Props = $props();

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
</script>

<div
  class="h-72 w-full sm:h-96"
  role="img"
  aria-label="Cumulative season points by week for each player"
  data-testid="season-trend-chart"
>
  <LineChart x="week_number" y="cumulative_points" series={chartSeries} points yDomain={null} />
</div>

<ul class="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm" aria-label="Chart legend">
  {#each chartSeries as series (series.key)}
    <li class="flex items-center gap-2">
      <span class="size-2.5 rounded-full" style:background-color={series.color} aria-hidden="true"
      ></span>
      <span>{series.label}</span>
    </li>
  {/each}
</ul>

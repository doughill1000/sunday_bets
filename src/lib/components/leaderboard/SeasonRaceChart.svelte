<script lang="ts">
  // The League-home season race (#561): every member's cumulative points by week on one chart,
  // framed as "the race" rather than a per-player stats breakdown. Reuses the same
  // `stats_season_trend` rows and `buildTrendSeries` transform as the /stats SeasonTrendChart.
  //
  // Because ~6 muted lines bunch together and are hard to tell apart, the chart is driven by a
  // player chip row (the shared ChipRadiogroup — the app's "switch which cut is in focus"
  // pattern, DESIGN principle 2): one player is highlighted at a time — their line is the brand
  // line drawn on top and labelled at its finish, the rest are muted context. It defaults to the
  // current user, so it opens on "your race" but lets you interrogate any rival's trajectory.
  import type { ComponentProps } from 'svelte';
  import { LineChart } from 'layerchart';
  import ChipRadiogroup from '$lib/components/stats/ChipRadiogroup.svelte';
  import { buildTrendSeries } from '$lib/utils/stats';
  import { dismissTooltipOnScroll } from '$lib/utils/chartTooltip';
  import type { SeasonTrendEntry } from '$lib/types/server/stats';

  interface Props {
    rows: SeasonTrendEntry[];
    currentUserId?: string | null;
  }

  let { rows, currentUserId = null }: Props = $props();

  const HIGHLIGHT_COLOR = 'var(--primary)';
  const PACK_COLOR = 'color-mix(in oklab, var(--muted-foreground) 55%, transparent)';

  // `buildTrendSeries` already groups rows into one entry per player, so it doubles as the
  // distinct-player source for the chips — no separate de-dupe needed.
  const series = $derived(buildTrendSeries(rows));

  // Chip order: the current user first, then alphabetical.
  const players = $derived(
    series
      .map((s) => ({ userId: s.userId, displayName: s.displayName }))
      .toSorted((a, b) => {
        if (a.userId === currentUserId) return -1;
        if (b.userId === currentUserId) return 1;
        return a.displayName.localeCompare(b.displayName);
      })
  );

  const chipOptions = $derived(
    players.map((p) => ({
      value: p.userId,
      label: p.userId === currentUserId ? 'You' : p.displayName
    }))
  );

  // The highlighted player. Null until the user picks a chip, then falls back to the current user
  // (or the first racer), and re-resolves if the chosen player leaves the set on a season switch.
  let picked = $state<string | null>(null);
  const highlighted = $derived.by(() => {
    if (picked != null && players.some((p) => p.userId === picked)) return picked;
    if (currentUserId != null && players.some((p) => p.userId === currentUserId))
      return currentUserId;
    return players[0]?.userId ?? null;
  });

  // The highlighted series is appended last so its line paints on top of the muted pack.
  const chartSeries = $derived(
    series
      .map((s) => {
        const active = s.userId === highlighted;
        return {
          key: s.userId,
          label: s.displayName,
          data: s.points,
          active,
          color: active ? HIGHLIGHT_COLOR : PACK_COLOR
        };
      })
      .toSorted((a, b) => Number(a.active) - Number(b.active))
  );

  // Weeks are whole numbers, so force integer ticks instead of the linear scale's fractions.
  const weekTicks = $derived(
    [...new Set(rows.map((r) => r.week_number))].toSorted((a, b) => a - b)
  );

  // layerchart's axis labels rely on a `fill-surface-content` class our Tailwind build doesn't
  // generate (it skips node_modules), so set the fill directly (matching SeasonTrendChart).
  const tickLabelProps = { fill: 'var(--muted-foreground)' };

  // Bound so `dismissTooltipOnScroll` can hide the tooltip when an iOS/Android scroll gesture
  // cancels the pointer that opened it (otherwise the popover freezes on screen — see the action).
  let chartContext = $state<ComponentProps<typeof LineChart>['context']>();
</script>

{#if chartSeries.length > 0}
  <div class="space-y-3">
    {#if chipOptions.length > 1}
      <ChipRadiogroup
        options={chipOptions}
        value={highlighted ?? ''}
        ariaLabel="Highlight a player in the race"
        idPrefix="race-player"
        onchange={(v) => (picked = v)}
      />
    {/if}

    <!-- Lines only, no per-week markers: at ~6 players × ~18 weeks the dots read as a crowd of
         bubbles that bury the trajectories. The race is about the *lines*; only the highlighted
         player's line carries an endpoint dot + name label, so the close muted lines stay clean. -->
    <div
      class="h-64 w-full sm:h-80"
      role="img"
      aria-label="The season race: cumulative points by week for each player, with the selected player highlighted"
      data-testid="season-race-chart"
      use:dismissTooltipOnScroll={() => chartContext}
    >
      <LineChart
        bind:context={chartContext}
        x="week_number"
        y="cumulative_points"
        series={chartSeries}
        yDomain={null}
        props={{
          spline: { fill: 'none' },
          xAxis: { ticks: weekTicks, format: (value) => String(value), tickLabelProps },
          yAxis: { tickLabelProps }
        }}
      >
        <!-- Endpoint marker + name label for the highlighted line only, anchored back into the
             plot (text-anchor="end", up-left of the point) so nothing clips the right edge. -->
        {#snippet aboveMarks({ context })}
          {#each chartSeries as s (s.key)}
            {#if s.active}
              {@const last = s.data[s.data.length - 1]}
              {#if last}
                {@const cx = context.xScale(last.week_number)}
                {@const cy = context.yScale(last.cumulative_points)}
                <circle {cx} {cy} r="4" fill={s.color} />
                <text
                  x={cx - 6}
                  y={cy - 6}
                  text-anchor="end"
                  fill={s.color}
                  class="text-xs font-semibold"
                >
                  {s.key === currentUserId ? `${s.label} (you)` : s.label}
                </text>
              {/if}
            {/if}
          {/each}
        {/snippet}
      </LineChart>
    </div>
  </div>
{/if}

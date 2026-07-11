<script lang="ts">
  // "Where the market bends" synthesis chart (issue #517) — the lead view of the /league Trends
  // tab. A diverging bar per situational cut showing how far its *favorite* cover rate bends
  // from a 50/50 coin flip: gold bars grow right when favorites cover, sky bars grow left when
  // underdogs do. The whole story of the six situational cards in one glance, before the reader
  // drills into any one cut via the chips below. Ranking + cover math live in the pure
  // `topMarketBends` transform; this component only draws the rows. Honest by construction: the
  // bars stay small because the market is efficient, and each row keeps its n= sample size.
  import type { MarketBend } from '$lib/utils/leagueBends';
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
  } from '$lib/components/ui/card';

  let { bends }: { bends: MarketBend[] } = $props();

  // Fixed, honest scale: 10 percentage points of deviation fills half the track (its edge), so
  // a 1-point bend is a 1-point-sized bar — small deviations look small, never auto-stretched to
  // fill the axis. Clamped at the half-track so a rare large bend can't overflow.
  const MAX_HALF = 50; // percent of the track from the centre line to an edge
  const barWidth = (deviation: number) => Math.min(MAX_HALF, Math.abs(deviation) * 500);

  // One-decimal cover %, e.g. 0.531 → "53.1%". The app-wide formatAccuracy rounds to whole
  // percent, which would erase the very few-point deviations this chart exists to show.
  const pct1 = (cover: number) => `${(cover * 100).toFixed(1)}%`;
</script>

{#if bends.length > 0}
  <Card data-testid="league-market-bends">
    <CardHeader>
      <CardTitle>Where the market bends</CardTitle>
      <CardDescription>
        Favorite cover rate vs a 50/50 coin flip. Small by design — the line is efficient.
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-3">
      <ul class="space-y-1.5">
        {#each bends as bend (bend.key)}
          <li
            class="grid grid-cols-[6.5rem_1fr_3rem] items-center gap-x-2 sm:grid-cols-[9.5rem_1fr_3.5rem]"
          >
            <div class="min-w-0">
              <div class="truncate text-xs font-medium sm:text-sm" title={bend.label}>
                {bend.label}
              </div>
              <div class="text-[0.65rem] text-muted-foreground tabular-nums">n={bend.games}</div>
            </div>

            <!-- Diverging track: centre line is the 50% coin flip; the bar grows from it. -->
            <div
              class="relative h-5 rounded-[5px]"
              style="background: linear-gradient(90deg, color-mix(in oklab, var(--chart-2) 8%, transparent), transparent 48%, transparent 52%, color-mix(in oklab, var(--primary) 8%, transparent));"
              aria-hidden="true"
            >
              <span class="absolute inset-y-[-3px] left-1/2 w-px -translate-x-1/2 bg-foreground/40"
              ></span>
              {#if bend.side === 'fav'}
                <span
                  class="absolute inset-y-1 left-1/2 rounded-[3px] bg-primary"
                  style="width: {barWidth(bend.deviation)}%"
                ></span>
              {:else}
                <span
                  class="absolute inset-y-1 right-1/2 rounded-[3px] bg-chart-2"
                  style="width: {barWidth(bend.deviation)}%"
                ></span>
              {/if}
            </div>

            <div
              class="text-right font-mono text-xs tabular-nums {bend.side === 'fav'
                ? 'text-primary'
                : 'text-chart-2'}"
            >
              {pct1(bend.coverPct)}
            </div>
          </li>
        {/each}
      </ul>

      <div
        class="flex gap-4 text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase"
      >
        <span class="flex items-center gap-1.5">
          <span class="size-2 rounded-[2px] bg-chart-2" aria-hidden="true"></span> Dogs cover
        </span>
        <span class="flex items-center gap-1.5">
          <span class="size-2 rounded-[2px] bg-primary" aria-hidden="true"></span> Favs cover
        </span>
      </div>
    </CardContent>
  </Card>
{/if}

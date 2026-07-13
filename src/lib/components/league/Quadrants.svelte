<script lang="ts">
  // NFL-wide home/away × favorite/underdog cover rates for the /market situational-cuts module
  // (issue #426, meter treatment #517). Reads the four pre-aggregated league_ats_quadrants rows
  // off the single league payload; cover % comes from the shared `coverPct` helper (never
  // recomputed here) and is drawn as a meter with a 50% baseline tick beneath each figure.
  //
  // The two home/away summary lines above the grid are the side marginal of the same joint
  // (issue #525): the standalone Home/away chip was fully contained here, so it folded in. They
  // read from the separate `homeAway` payload field (the pick'em-inclusive marginal), not summed
  // from the four fav/dog cells, so the figures match the old standalone card exactly.
  import type { LeagueQuadrant, LeagueHomeAway } from '$lib/types/server/league';
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
  } from '$lib/components/ui/card';
  import CoverMeter from '$lib/components/CoverMeter.svelte';
  import { formatAccuracy } from '$lib/utils/stats';
  import { coverPct } from '$lib/utils/leagueAts';

  let { quadrants, homeAway }: { quadrants: LeagueQuadrant[]; homeAway: LeagueHomeAway | null } =
    $props();

  // The two side marginals (home/away), shown as summary lines above the four cells.
  const sides = $derived(
    homeAway
      ? [
          { label: 'Home', ats: homeAway.home.ats },
          { label: 'Away', ats: homeAway.away.ats }
        ]
      : []
  );

  // The four cells in a fixed, readable order, each resolved to its row (or null if absent).
  const CELLS: { label: string; isHome: boolean; isFavorite: boolean }[] = [
    { label: 'Home favorite', isHome: true, isFavorite: true },
    { label: 'Home underdog', isHome: true, isFavorite: false },
    { label: 'Road favorite', isHome: false, isFavorite: true },
    { label: 'Road underdog', isHome: false, isFavorite: false }
  ];

  const cells = $derived(
    CELLS.map((cell) => ({
      label: cell.label,
      quadrant:
        quadrants.find((q) => q.isHome === cell.isHome && q.isFavorite === cell.isFavorite) ?? null
    }))
  );
</script>

{#if quadrants.length > 0}
  <Card data-testid="league-quadrants">
    <CardHeader>
      <CardTitle>Home & away favorites</CardTitle>
      <CardDescription>Cover rate by side and role.</CardDescription>
    </CardHeader>
    <CardContent class="space-y-6">
      {#if sides.length > 0}
        <dl class="grid grid-cols-2 gap-x-6 gap-y-4 sm:max-w-md">
          {#each sides as side (side.label)}
            {@const pct = coverPct(side.ats)}
            <div>
              <dt class="text-xs font-medium text-muted-foreground">{side.label}</dt>
              <dd class="text-2xl font-bold">{formatAccuracy(pct)}</dd>
              <CoverMeter {pct} class="mt-1.5" />
              <p class="mt-1.5 text-xs text-muted-foreground tabular-nums">
                {side.ats.wins}-{side.ats.losses}-{side.ats.pushes} ATS
              </p>
            </div>
          {/each}
        </dl>
      {/if}

      <dl class="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        {#each cells as cell (cell.label)}
          {@const pct = cell.quadrant ? coverPct(cell.quadrant.ats) : null}
          <div>
            <dt class="text-xs font-medium text-muted-foreground">{cell.label}</dt>
            <dd class="text-2xl font-bold">{formatAccuracy(pct)}</dd>
            <CoverMeter {pct} class="mt-1.5" />
            <p class="mt-1.5 text-xs text-muted-foreground tabular-nums">
              {#if cell.quadrant}
                {cell.quadrant.ats.wins}-{cell.quadrant.ats.losses}-{cell.quadrant.ats.pushes} ATS
              {:else}
                no games
              {/if}
            </p>
          </div>
        {/each}
      </dl>
    </CardContent>
  </Card>
{/if}

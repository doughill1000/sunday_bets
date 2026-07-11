<script lang="ts">
  // League-wide home/away × favorite/underdog cover rates for the /league market-cuts module
  // (issue #426, meter treatment #517). Reads the four pre-aggregated league_ats_quadrants rows
  // off the single league payload; cover % comes from the shared `coverPct` helper (never
  // recomputed here) and is drawn as a meter with a 50% baseline tick beneath each figure.
  import type { LeagueQuadrant } from '$lib/types/server/league';
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

  let { quadrants }: { quadrants: LeagueQuadrant[] } = $props();

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
      <CardTitle>Home & road, favorites & dogs</CardTitle>
      <CardDescription>
        League-wide cover rate for each side of the matchup against the spread.
      </CardDescription>
    </CardHeader>
    <CardContent>
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

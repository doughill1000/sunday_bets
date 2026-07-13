<script lang="ts">
  // /league divisional module (issue #427, meter treatment #517): favorite ATS cover rate for
  // divisional vs non-divisional matchups, NFL-wide. Reads the pre-shaped LeagueDivisionalSplit
  // rows from the single /league payload (games with an unknown division are excluded upstream in
  // league_ats_divisional); cover math lives in coverPct, never here, and is drawn as a meter with
  // a 50% baseline tick beneath each figure. A thin bucket carries an n= caveat.
  import type { LeagueDivisionalSplit } from '$lib/types/server/league';
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
  } from '$lib/components/ui/card';
  import CoverMeter from '$lib/components/CoverMeter.svelte';
  import { coverPct, isThinSample, LEAGUE_THIN_SAMPLE } from '$lib/utils/leagueAts';
  import { formatAccuracy } from '$lib/utils/stats';

  let { splits }: { splits: LeagueDivisionalSplit[] } = $props();

  // Present divisional first, then non-divisional; drop any bucket with no games.
  const ordered = $derived(
    [true, false].flatMap((flag) => {
      const row = splits.find((s) => s.isDivisional === flag);
      return row && row.games > 0 ? [row] : [];
    })
  );
  const hasThin = $derived(ordered.some((s) => isThinSample(s.games)));
</script>

{#if ordered.length > 0}
  <Card data-testid="league-divisional">
    <CardHeader>
      <CardTitle>Divisional vs. non-divisional</CardTitle>
      <CardDescription>
        How often the spread favorite covers by matchup type, NFL-wide.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <dl class="grid grid-cols-1 gap-6 sm:max-w-md sm:grid-cols-2">
        {#each ordered as split (split.isDivisional)}
          {@const thin = isThinSample(split.games)}
          {@const pct = coverPct({ wins: split.favoriteCovers, losses: split.underdogCovers })}
          <div>
            <dt class="text-xs font-medium text-muted-foreground">
              {split.isDivisional ? 'Divisional' : 'Non-divisional'}
            </dt>
            <dd class="text-3xl font-bold">{formatAccuracy(pct)}</dd>
            <CoverMeter {pct} class="mt-2" />
            <p class="mt-1.5 text-xs text-muted-foreground">
              {split.favoriteCovers}-{split.underdogCovers}-{split.pushes} favorites ATS{#if thin}<span
                  class="text-warning"
                  title="Small sample — treat with caution">*</span
                >{/if}
            </p>
          </div>
        {/each}
      </dl>

      {#if hasThin}
        <p class="mt-3 text-xs text-muted-foreground">
          <span class="text-warning">*</span> Small sample — cover % from fewer than {LEAGUE_THIN_SAMPLE}
          games is noisy; treat with caution.
        </p>
      {/if}
    </CardContent>
  </Card>
{/if}

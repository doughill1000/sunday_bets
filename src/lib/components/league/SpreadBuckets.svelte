<script lang="ts">
  // Favorite cover % by spread-size bucket for the /league market-cuts module (issue #426, meter
  // treatment #517). Reads the pre-aggregated league_ats_spread_buckets rows off the single
  // league payload — the cover math lives in `bucketCoverPct` (which reuses `coverPct`), never
  // here. Cover % renders as a shared meter with a 50% baseline tick (the exact figure kept as a
  // caption), so the rate reads pre-attentively and never clips off a 390px screen the way the
  // old right-aligned table cell did.
  import type { LeagueSpreadBucket } from '$lib/types/server/league';
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
  } from '$lib/components/ui/card';
  import CoverMeter from '$lib/components/CoverMeter.svelte';
  import { formatAccuracy } from '$lib/utils/stats';
  import { bucketCoverPct, MIN_BUCKET_SAMPLE } from '$lib/utils/leagueAts';

  let { buckets }: { buckets: LeagueSpreadBucket[] } = $props();

  // Human labels for the raw bucket keys; the en-dash reads better than a hyphen for ranges.
  const LABELS: Record<string, string> = {
    pickem: "Pick'em",
    '1-3': '1–3',
    '3.5-6.5': '3.5–6.5',
    '7-9.5': '7–9.5',
    '10+': '10+'
  };
  const label = (bucket: string): string => LABELS[bucket] ?? bucket;
</script>

{#if buckets.length > 0}
  <Card data-testid="league-spread-buckets">
    <CardHeader>
      <CardTitle>Favorites by spread size</CardTitle>
      <CardDescription>
        How often the favorite covers, split by how big the line is.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <ul class="space-y-3">
        {#each buckets as bucket (bucket.bucketOrder)}
          {@const pct = bucketCoverPct(bucket)}
          <li>
            <div class="flex items-baseline justify-between gap-2 text-sm">
              <span class="font-medium whitespace-nowrap">{label(bucket.bucket)}</span>
              <span class="flex items-baseline gap-2">
                {#if bucket.bucketOrder === 0}
                  <span class="text-muted-foreground" title="Pick'em games have no favorite">—</span
                  >
                {:else if pct == null}
                  <span
                    class="text-xs text-muted-foreground"
                    title="Fewer than {MIN_BUCKET_SAMPLE} decided games — too small to show a rate"
                    >n too small</span
                  >
                {:else}
                  <span class="font-mono tabular-nums">{formatAccuracy(pct)}</span>
                {/if}
                <span class="text-xs text-muted-foreground tabular-nums"
                  >{bucket.games} {bucket.games === 1 ? 'game' : 'games'}</span
                >
              </span>
            </div>
            <CoverMeter {pct} class="mt-1.5" />
          </li>
        {/each}
      </ul>
    </CardContent>
  </Card>
{/if}

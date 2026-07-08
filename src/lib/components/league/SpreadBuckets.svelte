<script lang="ts">
  // Favorite cover % by spread-size bucket for the /league market-cuts module (issue #426).
  // Reads the pre-aggregated league_ats_spread_buckets rows off the single league payload —
  // the cover math lives in `bucketCoverPct` (which reuses `coverPct`), never here.
  import type { LeagueSpreadBucket } from '$lib/types/server/league';
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
  } from '$lib/components/ui/card';
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
  } from '$lib/components/ui/table';
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
    <CardContent class="overflow-x-auto px-2 sm:px-6">
      <Table class="text-xs sm:text-sm">
        <TableHeader>
          <TableRow>
            <TableHead>Spread</TableHead>
            <TableHead class="text-right">Fav cover</TableHead>
            <TableHead class="text-right">Games</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each buckets as bucket (bucket.bucketOrder)}
            {@const pct = bucketCoverPct(bucket)}
            <TableRow>
              <TableCell class="font-medium whitespace-nowrap">{label(bucket.bucket)}</TableCell>
              <TableCell class="text-right">
                {#if bucket.bucketOrder === 0}
                  <span class="text-muted-foreground" title="Pick'em games have no favorite">—</span
                  >
                {:else if pct == null}
                  <span
                    class="text-muted-foreground"
                    title="Fewer than {MIN_BUCKET_SAMPLE} decided games — too small to show a rate"
                    >n too small</span
                  >
                {:else}
                  <span class="tabular-nums">{formatAccuracy(pct)}</span>
                {/if}
              </TableCell>
              <TableCell class="text-right tabular-nums">{bucket.games}</TableCell>
            </TableRow>
          {/each}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
{/if}

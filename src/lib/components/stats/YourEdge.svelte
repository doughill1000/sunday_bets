<script lang="ts">
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
  } from '$lib/components/ui/card';
  import {
    EDGE_MIN_SAMPLE,
    formatAccuracy,
    situationalEdges,
    topSituationalEdges
  } from '$lib/utils/stats';
  import type {
    LeagueSituationalBaselineEntry,
    SituationalSplitEntry
  } from '$lib/types/server/stats';

  let {
    splits,
    baseline,
    isYou,
    displayName
  }: {
    /** The selected player's career situational splits — already filtered to that player. */
    splits: SituationalSplitEntry[];
    /** League-wide market baseline per cut; identical for everyone. */
    baseline: LeagueSituationalBaselineEntry[];
    isYou: boolean;
    displayName: string;
  } = $props();

  // The synthesis: join the player's per-cut cover rate to the market baseline, keep the
  // best-sampled cuts, and show where they most beat or trail the spread. Career-first (#502).
  const edges = $derived(topSituationalEdges(situationalEdges(splits, baseline)));

  const subject = $derived(isYou ? 'you' : displayName);
  const possessive = $derived(isYou ? 'Your' : `${displayName}'s`);

  function deltaLabel(delta: number): string {
    return `${delta >= 0 ? '+' : '−'}${Math.round(Math.abs(delta) * 100)}%`;
  }
</script>

<Card>
  <CardHeader>
    <CardTitle>{possessive} edge</CardTitle>
    <CardDescription>
      Where {subject} beat or trail the market against the spread, all-time.
    </CardDescription>
  </CardHeader>
  <CardContent>
    {#if edges.length === 0}
      <p class="text-sm text-muted-foreground">
        {possessive} edge unlocks as {isYou ? 'you build up' : `${displayName} builds up`} more history
        — each cut needs at least {EDGE_MIN_SAMPLE} graded picks before it shows up here.
      </p>
    {:else}
      <ul class="space-y-3">
        {#each edges as edge (edge.dimension + ':' + edge.bucket)}
          {@const beating = edge.delta >= 0}
          <li class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate font-medium">{edge.label}</p>
              <p class="text-xs tabular-nums text-muted-foreground">
                {edge.wins}-{edge.losses}{edge.pushes > 0 ? `-${edge.pushes}` : ''} · {formatAccuracy(
                  edge.accuracy
                )} cover
              </p>
            </div>
            <div class="shrink-0 text-right">
              <p
                class="text-lg font-bold tabular-nums {beating
                  ? 'text-success'
                  : 'text-destructive'}"
              >
                {deltaLabel(edge.delta)}
              </p>
              <p class="text-xs text-muted-foreground">
                vs league {formatAccuracy(edge.leagueAccuracy)}
              </p>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </CardContent>
</Card>

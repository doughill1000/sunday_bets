<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { weightLabel } from '$lib/utils/stats';
  import type { WeeklyGameBreakdown, WeeklyPickRow } from '$lib/types/leaderboard';

  let { game }: { game: WeeklyGameBreakdown } = $props();

  function outcomeClass(outcome: WeeklyPickRow['outcome']): string {
    if (outcome === 'win') return 'text-green-600 dark:text-green-400';
    if (outcome === 'loss') return 'text-red-600 dark:text-red-400';
    return 'text-muted-foreground';
  }

  const scoreLabel = $derived(game.isFinal ? `${game.awayScore} – ${game.homeScore}` : null);
</script>

<Card class="shadow-sm">
  <CardHeader class="pb-2">
    <CardTitle class="text-base font-semibold">
      {game.away} @ {game.home}
      {#if scoreLabel}
        <span class="ml-2 text-sm font-normal text-muted-foreground">Final {scoreLabel}</span>
      {/if}
    </CardTitle>
  </CardHeader>
  <CardContent class="space-y-1 pt-0">
    {#if game.picks.length === 0}
      <p class="text-sm text-muted-foreground">Picks reveal at kickoff.</p>
    {:else}
      {#each game.picks as row (row.userId)}
        <div class="flex items-center justify-between gap-2 py-0.5 text-sm">
          <span class={row.isYou ? 'font-semibold' : ''}>
            {row.displayName}{row.isYou ? ' (you)' : ''}
          </span>
          {#if row.pickedTeamShort && row.weight}
            <span class="flex items-center gap-2 {outcomeClass(row.outcome)}">
              <span>{row.pickedTeamShort} · {weightLabel(row.weight)}</span>
              {#if row.pointsDelta != null}
                <span class="tabular-nums">{row.pointsDelta > 0 ? '+' : ''}{row.pointsDelta}</span>
              {/if}
            </span>
          {:else if row.outcome === 'missed'}
            <span class="text-muted-foreground">—</span>
          {:else}
            <span class="text-muted-foreground text-xs">Picks reveal at kickoff.</span>
          {/if}
        </div>
      {/each}
    {/if}
  </CardContent>
</Card>

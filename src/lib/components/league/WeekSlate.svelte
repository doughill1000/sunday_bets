<script lang="ts">
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
  } from '$lib/components/ui/card';
  import { formatKickoff } from '$lib/ui/format';
  import type { LeagueSlate } from '$lib/types/server/league';

  interface Props {
    /** The slate payload, or `null` while it's still loading. */
    slate?: LeagueSlate | null;
    loading?: boolean;
    error?: boolean;
  }
  let { slate = null, loading = false, error = false }: Props = $props();

  // Empty when the offseason / a bye / a non-scoring week leaves nothing to pick.
  const games = $derived(slate?.games ?? []);
</script>

<Card data-testid="league-slate">
  <CardHeader>
    <CardTitle>
      This week's slate{#if slate?.weekNumber != null}
        — Week {slate.weekNumber}{/if}
    </CardTitle>
    <CardDescription>
      Upcoming games with each side's record against the spread in this exact situation — a pre-pick
      companion, not a prediction. Small samples are noisy; treat them with caution.
    </CardDescription>
  </CardHeader>
  <CardContent>
    {#if loading}
      <div class="h-24 w-full animate-pulse rounded-lg bg-muted" aria-hidden="true"></div>
    {:else if error}
      <p class="text-sm text-muted-foreground">
        Couldn't load this week's slate. Refresh to try again.
      </p>
    {:else if games.length === 0}
      <p class="text-sm text-muted-foreground" data-testid="league-slate-empty">
        No upcoming games right now — it's the offseason or a bye. Check back when the next scoring
        week is on the board.
      </p>
    {:else}
      <ul class="divide-y divide-border">
        {#each games as game (game.gameId)}
          <li>
            <a
              href="/picks#game-{game.gameId}"
              class="-mx-2 flex flex-col gap-1 rounded-lg px-2 py-3 transition-colors hover:bg-muted/60"
              data-testid="league-slate-game"
            >
              <div class="flex items-baseline justify-between gap-3">
                <span class="font-medium">{game.away.label} @ {game.home.label}</span>
                <time
                  class="shrink-0 text-xs whitespace-nowrap text-muted-foreground"
                  datetime={game.kickoff}
                >
                  {formatKickoff(game.kickoff)}
                </time>
              </div>
              {#if game.away.nugget}
                <p class="text-[11px] leading-tight text-muted-foreground">
                  {game.away.label}: {game.away.nugget.text} (n={game.away.nugget.games})
                </p>
              {/if}
              {#if game.home.nugget}
                <p class="text-[11px] leading-tight text-muted-foreground">
                  {game.home.label}: {game.home.nugget.text} (n={game.home.nugget.games})
                </p>
              {/if}
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </CardContent>
</Card>

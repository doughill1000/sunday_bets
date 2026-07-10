<script lang="ts">
  // Read-only frozen live-week picks screen for the demo (#460, ADR-0026). Shows the product's
  // verb — picking a team against the spread — from the persona's perspective, without the
  // interactive picks store the real PicksBoard/GameCard depend on. Committed picks render
  // locked; open games show a disabled pick affordance. Conversion lives in the single sticky
  // nav CTA — the demo keeps exactly one sign-up button.
  import { Card, CardContent, CardHeader } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { spreadLine, signedSpreadForTeam } from '$lib/domain/spread';
  import { formatKickoff } from '$lib/ui/format';
  import type { DemoLiveWeek, DemoLiveGame } from '$lib/types/demo';
  import type { WeightCode } from '$lib/types/domain';

  let { liveWeek, personaName }: { liveWeek: DemoLiveWeek; personaName: string } = $props();

  const WEIGHT_LABEL: Record<WeightCode, string> = {
    L: 'Low',
    M: 'Medium',
    H: 'High',
    A: 'All-In'
  };

  const open = $derived(liveWeek.games.filter((g) => g.status === 'open'));
  const committed = $derived(liveWeek.games.filter((g) => g.status !== 'open'));

  function pickedTeamName(g: DemoLiveGame): string | null {
    if (!g.personaPick) return null;
    return g.personaPick.side === 'home' ? g.home : g.away;
  }

  function outcomeLabel(g: DemoLiveGame): { text: string; tone: 'win' | 'loss' | 'push' } | null {
    if (g.status !== 'final' || !g.finalScores || !g.personaPick) return null;
    const { home, away } = g.finalScores;
    const spread = g.spreadValue ?? 0;
    const favIsHome = g.spreadTeamId === g.homeTeamId;
    // Margin of the picked side relative to the spread.
    const favMargin = favIsHome ? home - away : away - home;
    const pickedFav = (g.personaPick.side === 'home') === favIsHome;
    const cover = favMargin - spread; // >0 fav covers, <0 dog covers, 0 push
    if (cover === 0) return { text: 'Push', tone: 'push' };
    const favCovered = cover > 0;
    const won = pickedFav === favCovered;
    return won ? { text: 'Covered', tone: 'win' } : { text: 'Missed', tone: 'loss' };
  }
</script>

<section class="mx-auto w-full max-w-screen-xl space-y-6" aria-labelledby="demo-picks-heading">
  <div>
    <h1 id="demo-picks-heading" class="text-3xl font-bold tracking-tight">
      Week {liveWeek.weekNumber} picks
    </h1>
    <p class="mt-1 text-muted-foreground">
      This is how you play: each week, pick a team against the spread and weight how confident you
      are. Here's {personaName}'s week.
    </p>
  </div>

  {#if open.length > 0}
    <div class="space-y-3">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Still to pick
      </h2>
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {#each open as g (g.id)}
          <Card class="rounded-2xl" data-testid="demo-open-game">
            <CardHeader class="flex-row items-start justify-between pb-2">
              <div class="min-w-0">
                <h3 class="truncate font-semibold">{g.away} @ {g.home}</h3>
                <p class="truncate text-sm font-semibold">{spreadLine(g)}</p>
              </div>
              <time class="text-sm font-medium whitespace-nowrap" datetime={g.kickoff}>
                {formatKickoff(g.kickoff)}
              </time>
            </CardHeader>
            <CardContent class="space-y-3">
              <div class="grid grid-cols-2 gap-2" aria-hidden="true">
                {#each ['away', 'home'] as const as side (side)}
                  <div
                    class="rounded-lg border px-3 py-2 text-center text-sm opacity-60 select-none"
                  >
                    <span class="font-medium">{side === 'home' ? g.home : g.away}</span>
                    <span class="text-muted-foreground">{signedSpreadForTeam(g, side)}</span>
                  </div>
                {/each}
              </div>
            </CardContent>
          </Card>
        {/each}
      </div>
    </div>
  {/if}

  {#if committed.length > 0}
    <div class="space-y-3">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {personaName}'s locked picks
      </h2>
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {#each committed as g (g.id)}
          {@const picked = pickedTeamName(g)}
          {@const outcome = outcomeLabel(g)}
          <Card class="relative rounded-2xl" data-testid="demo-committed-game">
            {#if g.personaPick}
              <Badge
                variant="secondary"
                class="absolute top-3 right-3 z-10 flex flex-col items-end px-2 py-1 text-[11px]"
              >
                <span>{g.status === 'final' ? 'Final' : 'Locked'}</span>
                <span class="font-normal opacity-80">
                  {picked}{signedSpreadForTeam(g, g.personaPick.side)} · {WEIGHT_LABEL[
                    g.personaPick.weight
                  ]}
                </span>
              </Badge>
            {/if}
            <CardHeader class="pb-2">
              <h3 class="truncate pr-24 font-semibold">{g.away} @ {g.home}</h3>
              <p class="truncate text-sm font-semibold">{spreadLine(g)}</p>
            </CardHeader>
            <CardContent class="space-y-2">
              {#if g.finalScores}
                <p class="text-sm tabular-nums">
                  {g.away}
                  {g.finalScores.away} · {g.home}
                  {g.finalScores.home}
                </p>
              {/if}
              {#if picked}
                <p class="text-sm">
                  Pick: <span class="font-medium">{picked}</span>
                </p>
              {:else}
                <p class="text-sm text-muted-foreground">No pick — kickoff passed.</p>
              {/if}
              {#if outcome}
                <Badge
                  variant={outcome.tone === 'win'
                    ? 'default'
                    : outcome.tone === 'loss'
                      ? 'destructive'
                      : 'secondary'}
                  data-testid="demo-outcome"
                >
                  {outcome.text}
                </Badge>
              {/if}
            </CardContent>
          </Card>
        {/each}
      </div>
    </div>
  {/if}
</section>

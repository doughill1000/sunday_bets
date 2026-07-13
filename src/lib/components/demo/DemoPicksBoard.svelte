<script lang="ts">
  // Read-only frozen live-week picks screen for the demo (#460, ADR-0026; live sweat #585). Shows
  // the product's verb — picking against the spread — AND the Sunday sweat that follows: the
  // persona's locked cards carry live cover verdicts, a "week so far" projection, and per-member
  // group dots, all from the frozen snapshot rather than the interactive picks store / ESPN feed
  // the real PicksBoard depends on. Cover math is the shared `liveCoverState`/`weekSoFarPoints`
  // mirror, and the group dots reuse the shipped `RevealedGroupPicks`, so the demo tracks the real
  // surfaces. Conversion lives in the single sticky nav CTA — the demo keeps one sign-up button.
  import { onMount, onDestroy } from 'svelte';
  import { Card, CardContent, CardHeader } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { spreadLine, signedSpreadForTeam } from '$lib/domain/spread';
  import { formatKickoff } from '$lib/ui/format';
  import { liveCoverState, weekSoFarPoints, type WeekSoFarPick } from '$lib/domain/liveCover';
  import { verdictLabel, verdictTextClass, fmtPoints } from '$lib/live/display';
  import { LIVE_POLL_MS } from '$lib/live/config';
  import RevealedGroupPicks from '$lib/components/picks/RevealedGroupPicks.svelte';
  import type { DemoLiveWeek, DemoLiveGame } from '$lib/types/demo';
  import type { WeightCode } from '$lib/types/domain';

  let {
    liveWeek,
    personaName,
    personaUserId
  }: { liveWeek: DemoLiveWeek; personaName: string; personaUserId: string } = $props();

  const WEIGHT_LABEL: Record<WeightCode, string> = {
    L: 'Low',
    M: 'Medium',
    H: 'High',
    A: 'All-In'
  };

  const openGames = $derived(liveWeek.games.filter((g) => g.status === 'open'));
  const liveGames = $derived(liveWeek.games.filter((g) => g.status !== 'open'));

  // Persona's live cover on a game — the display-only mirror of grading against the frozen score,
  // using the line locked on her pick — or null when she has no pick / no score (#585 / #386).
  function personaCover(g: DemoLiveGame) {
    if (!g.personaPick || !g.liveScore) return null;
    const pickedTeamId = g.personaPick.side === 'home' ? g.homeTeamId : g.awayTeamId;
    const state = liveCoverState({
      homeScore: g.liveScore.homeScore,
      awayScore: g.liveScore.awayScore,
      homeTeamId: g.homeTeamId,
      awayTeamId: g.awayTeamId,
      pickedTeamId,
      lockedSpreadTeamId: g.spreadTeamId,
      lockedSpreadValue: g.spreadValue
    });
    return state ? { ...state, score: g.liveScore } : null;
  }

  function pickedTeamName(g: DemoLiveGame): string | null {
    if (!g.personaPick) return null;
    return g.personaPick.side === 'home' ? g.home : g.away;
  }

  // Persona's live "week so far" (unofficial), the same projection the real PicksSummaryBar shows.
  const myLivePicks = $derived.by<WeekSoFarPick[]>(() =>
    liveGames
      .filter((g) => g.personaPick && g.liveScore)
      .map((g) => ({
        weight: g.personaPick?.weight ?? null,
        verdict: personaCover(g)?.verdict ?? null
      }))
  );
  const decidedCount = $derived(myLivePicks.filter((p) => p.verdict != null).length);
  const weekSoFar = $derived(weekSoFarPoints(myLivePicks));

  // Freshness anchored to page load: the demo has no live feed, so instead of an ever-aging baked
  // timestamp the "Updated Ns ago" stamp counts from mount and cycles under the real poll cadence,
  // so it always reads plausibly fresh (#585 — freshness anchored client-side to page-load).
  let elapsed = $state(0);
  let ticker: ReturnType<typeof setInterval>;
  onMount(() => {
    ticker = setInterval(() => {
      elapsed += 1;
    }, 1000);
  });
  onDestroy(() => clearInterval(ticker));
  const freshnessSec = $derived(elapsed % (LIVE_POLL_MS / 1000 + 1));
</script>

<section class="mx-auto w-full max-w-screen-xl space-y-6" aria-labelledby="demo-picks-heading">
  <div>
    <h1 id="demo-picks-heading" class="text-3xl font-bold tracking-tight">
      Week {liveWeek.weekNumber} picks
    </h1>
    <p class="mt-1 text-muted-foreground">
      This is how you play: pick against the spread, weight your confidence, then sweat it out live
      on Sunday. Here's {personaName}'s slate mid-games.
    </p>
  </div>

  {#if decidedCount > 0}
    <!-- Live "week so far" (mirrors PicksSummaryBar): unofficial, yields to grading. -->
    <div
      class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border bg-muted/30 px-4 py-3 text-sm"
      data-testid="demo-week-so-far"
      aria-live="polite"
    >
      <span class="inline-flex items-center gap-1.5 font-semibold text-destructive">
        <span class="size-2 animate-pulse rounded-full bg-destructive"></span>
        LIVE
      </span>
      <span class="text-muted-foreground">Week so far</span>
      <span
        class="font-semibold tabular-nums {weekSoFar > 0
          ? 'text-success'
          : weekSoFar < 0
            ? 'text-destructive'
            : 'text-foreground'}"
        data-testid="demo-week-so-far-points"
      >
        {weekSoFar > 0 ? '+' : ''}{fmtPoints(weekSoFar)}
      </span>
      <span class="text-muted-foreground">· unofficial</span>
      <span class="ml-auto text-[11px] text-muted-foreground" data-testid="demo-freshness">
        Updated {freshnessSec}s ago
      </span>
    </div>
  {/if}

  {#if liveGames.length > 0}
    <div class="space-y-3">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {personaName}'s picks — live
      </h2>
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {#each liveGames as g (g.id)}
          {@const picked = pickedTeamName(g)}
          {@const cover = personaCover(g)}
          {@const isFinal = g.status === 'final_unofficial'}
          <Card class="relative rounded-2xl" data-testid="demo-live-game">
            {#if g.personaPick}
              <Badge
                variant="secondary"
                class="absolute top-3 right-3 z-10 flex flex-col items-end px-2 py-1 text-[11px]"
              >
                <span>{isFinal ? 'Final' : 'Locked'}</span>
                <span class="font-normal opacity-80">
                  {picked}{signedSpreadForTeam(g, g.personaPick.side)} · {WEIGHT_LABEL[
                    g.personaPick.weight
                  ]}
                </span>
              </Badge>
            {/if}
            <CardHeader class="pb-2">
              <div class="flex items-center gap-2">
                {#if isFinal}
                  <span
                    class="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground"
                    data-testid="demo-live-flag"
                  >
                    <span class="size-1.5 rounded-full bg-muted-foreground"></span>
                    FINAL
                  </span>
                {:else}
                  <span
                    class="inline-flex items-center gap-1 text-xs font-semibold text-destructive"
                    data-testid="demo-live-flag"
                  >
                    <span class="size-1.5 animate-pulse rounded-full bg-destructive"></span>
                    LIVE
                  </span>
                {/if}
              </div>
              <h3 class="truncate pr-24 font-semibold">{g.away} @ {g.home}</h3>
              <p class="truncate text-sm font-semibold">{spreadLine(g)}</p>
            </CardHeader>
            <CardContent class="space-y-2">
              {#if g.liveScore}
                <div class="flex items-center gap-2 text-sm" data-testid="demo-live-score">
                  <span class="tabular-nums text-muted-foreground">
                    {g.away}
                    {g.liveScore.awayScore}–{g.liveScore.homeScore}
                    {g.home}
                    {#if !isFinal && g.liveScore.period}
                      · Q{g.liveScore.period}
                      {g.liveScore.displayClock ?? ''}
                    {:else if isFinal}
                      · unofficial
                    {/if}
                  </span>
                  {#if cover}
                    <span
                      class="ml-auto font-semibold {verdictTextClass(cover.verdict)}"
                      data-testid="demo-live-verdict"
                    >
                      {verdictLabel(cover.verdict, cover.cushion)}
                    </span>
                  {/if}
                </div>
              {/if}

              {#if picked}
                <p class="text-sm">
                  Pick: <span class="font-medium">{picked}</span>
                </p>
              {:else}
                <p class="text-sm text-muted-foreground">No pick — kickoff passed.</p>
              {/if}

              <RevealedGroupPicks
                picks={g.groupPicks}
                myUserId={personaUserId}
                game={g}
                liveScore={g.liveScore}
              />
            </CardContent>
          </Card>
        {/each}
      </div>
    </div>
  {/if}

  {#if openGames.length > 0}
    <div class="space-y-3">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Still to pick
      </h2>
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {#each openGames as g (g.id)}
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
</section>

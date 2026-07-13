<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { createQuery } from '@tanstack/svelte-query';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import { Button } from '$lib/components/ui/button';
  import { Alert, AlertTitle, AlertDescription } from '$lib/components/ui/alert';
  import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem
  } from '$lib/components/ui/dropdown-menu';
  import WeeklyPickCard from './WeeklyPickCard.svelte';
  import WeeklyLiveBoard from './WeeklyLiveBoard.svelte';
  import { queryKeys } from '$lib/query/keys';
  import { fetchLiveScores } from '$lib/query/fetchers';
  import { LIVE_POLL_MS, STALE_THRESHOLD_MS, isWithinLiveWindow } from '$lib/live/config';
  import { assembleWeeklyLiveStandings } from '$lib/utils/weeklyPicks';
  import type { SeasonWeekOption, WeeklyGameBreakdown } from '$lib/types/leaderboard';

  let {
    weeks,
    selectedWeek,
    breakdown
  }: {
    weeks: SeasonWeekOption[];
    selectedWeek: SeasonWeekOption | null;
    breakdown: WeeklyGameBreakdown[];
  } = $props();

  // --- Live sweat board (#584) --------------------------------------------------------------
  // The SSR-loaded weekly breakdown is static; live ESPN scores layer on top via the shared
  // #386 poll. Mirrors PicksBoard: poll only while a game is in its live window and the tab is
  // visible; a shared server cache + `['live-scores']` key collapse every viewer to ≤1 ESPN
  // fetch per window. Display-only — grading stays the sole settlement authority.
  let now = $state(Date.now());
  let ticker: ReturnType<typeof setInterval>;
  onMount(() => {
    ticker = setInterval(() => (now = Date.now()), 1000);
  });
  onDestroy(() => clearInterval(ticker));

  function kickoffMs(g: WeeklyGameBreakdown) {
    return new Date(g.kickoff).getTime();
  }
  const liveWindowActive = $derived(breakdown.some((g) => isWithinLiveWindow(kickoffMs(g), now)));

  const liveQuery = createQuery(() => ({
    queryKey: queryKeys.liveScores(),
    queryFn: () => fetchLiveScores(fetch),
    enabled: liveWindowActive,
    refetchInterval: LIVE_POLL_MS,
    refetchOnWindowFocus: true,
    staleTime: 0,
    gcTime: 60_000
  }));

  const liveScores = $derived(liveQuery.data?.scores ?? {});
  const liveFetchedAt = $derived(liveQuery.data?.fetchedAt ?? null);
  const liveStale = $derived.by(() => {
    if (!liveWindowActive) return false;
    if (liveQuery.isError) return true;
    if (!liveFetchedAt) return true;
    return now - new Date(liveFetchedAt).getTime() > STALE_THRESHOLD_MS;
  });

  // Live scores only count while a game is actually in its window — outside it we fall back to
  // the pure graded weekly order rather than a lingering cached poll. The ranked board keeps
  // its last-known number through a brief stale blip (like the picks summary bar), flagging it
  // with the header stamp; the per-card cover dots vanish on stale instead (like the #386 group
  // dots) — see WeeklyPickCard's `liveStale` gate.
  const activeLiveScores = $derived(liveWindowActive ? liveScores : {});
  const standings = $derived(assembleWeeklyLiveStandings(breakdown, activeLiveScores));
  // Show the board once at least one pick has a result (graded or live). Hidden on a
  // not-yet-started week, where every total is a flat zero.
  const showBoard = $derived(standings.some((s) => s.decided > 0));

  const currentIndex = $derived(
    selectedWeek != null ? weeks.findIndex((w) => w.weekNumber === selectedWeek.weekNumber) : -1
  );
  const hasPrev = $derived(currentIndex > 0);
  const hasNext = $derived(currentIndex >= 0 && currentIndex < weeks.length - 1);

  function navigate(weekNumber: number) {
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'weekly');
    url.searchParams.set('week', String(weekNumber));
    void goto(url.toString(), { invalidateAll: true, noScroll: true, keepFocus: true });
  }

  function prev() {
    if (hasPrev) navigate(weeks[currentIndex - 1].weekNumber);
  }

  function next() {
    if (hasNext) navigate(weeks[currentIndex + 1].weekNumber);
  }

  // Preseason rounds are stored as negative week_number (ADR-0016); label them as such
  // rather than showing "Week -1".
  function weekLabel(w: SeasonWeekOption | null): string {
    if (w == null) return 'No weeks started';
    return w.weekNumber < 0 ? `Preseason ${-w.weekNumber}` : `Week ${w.weekNumber}`;
  }
</script>

<div class="space-y-4" data-testid="weekly-breakdown">
  <!-- Week navigator -->
  <div class="flex items-center justify-between gap-2">
    <Button
      variant="outline"
      size="sm"
      onclick={prev}
      disabled={!hasPrev}
      aria-label="Previous week"
    >
      <ChevronLeft class="size-4" aria-hidden="true" />
    </Button>
    <DropdownMenu>
      <DropdownMenuTrigger>
        {#snippet child({ props })}
          <Button
            {...props}
            variant="ghost"
            size="sm"
            class="flex items-center gap-1 text-sm font-medium"
            aria-label="Jump to week"
          >
            {weekLabel(selectedWeek)}
            <svg
              class="h-3 w-3 shrink-0 opacity-60"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                clip-rule="evenodd"
              />
            </svg>
          </Button>
        {/snippet}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" class="max-h-64 overflow-y-auto">
        {#each weeks as w (w.weekNumber)}
          <DropdownMenuItem class="cursor-pointer" onclick={() => navigate(w.weekNumber)}>
            <span class="flex-1">{weekLabel(w)}</span>
            {#if selectedWeek?.weekNumber === w.weekNumber}
              <svg
                class="ml-2 h-4 w-4 shrink-0 text-primary-ink"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fill-rule="evenodd"
                  d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                  clip-rule="evenodd"
                />
              </svg>
            {/if}
          </DropdownMenuItem>
        {/each}
      </DropdownMenuContent>
    </DropdownMenu>
    <Button variant="outline" size="sm" onclick={next} disabled={!hasNext} aria-label="Next week">
      <ChevronRight class="size-4" aria-hidden="true" />
    </Button>
  </div>

  {#if selectedWeek && !selectedWeek.isScoring}
    <Alert data-testid="non-scoring-banner">
      <AlertTitle>This round doesn't count</AlertTitle>
      <AlertDescription>
        Results are shown for fun — they don't affect the season standings.
      </AlertDescription>
    </Alert>
  {/if}

  {#if weeks.length === 0}
    <p class="text-sm text-muted-foreground">No weeks have started yet.</p>
  {:else if breakdown.length === 0}
    <p class="text-sm text-muted-foreground">No games this week.</p>
  {:else}
    {#if showBoard}
      <WeeklyLiveBoard
        {standings}
        live={liveWindowActive}
        stale={liveStale}
        fetchedAt={liveFetchedAt}
        {now}
      />
    {/if}
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {#each breakdown as game (game.gameId)}
        <WeeklyPickCard {game} liveScore={activeLiveScores[game.gameId] ?? null} {liveStale} />
      {/each}
    </div>
  {/if}
</div>

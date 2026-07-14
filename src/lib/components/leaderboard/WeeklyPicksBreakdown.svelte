<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createQuery } from '@tanstack/svelte-query';
  import { Alert, AlertTitle, AlertDescription } from '$lib/components/ui/alert';
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
</script>

<div class="space-y-4" data-testid="weekly-breakdown">
  <!-- The week navigator that used to lead this component is now WeekNavigator, rendered by
       the Week tab above the week's hardware (#631). -->
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

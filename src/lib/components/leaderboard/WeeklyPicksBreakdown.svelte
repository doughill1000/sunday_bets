<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createQuery } from '@tanstack/svelte-query';
  import { Alert, AlertTitle, AlertDescription } from '$lib/components/ui/alert';
  import WeeklyPickCard from './WeeklyPickCard.svelte';
  import WeeklyLiveBoard from './WeeklyLiveBoard.svelte';
  import { queryKeys } from '$lib/query/keys';
  import { fetchLiveScores } from '$lib/query/fetchers';
  import {
    LIVE_POLL_MS,
    STALE_THRESHOLD_MS,
    isWithinLiveWindow,
    activeLiveScores,
    allGamesFinal
  } from '$lib/live/config';
  import { assembleWeeklyLiveStandings, orderWeeklyBreakdown } from '$lib/utils/weeklyPicks';
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

  // Games the feed could still tell us something about: inside their window AND not already
  // graded (#831). Excluding graded games keeps the wide 12h window cheap — once the grade cron
  // settles a game the DB has the authoritative score, so fetching ESPN for it buys nothing and
  // would only produce a live payload that must then lose to the graded one anyway.
  const liveWindowGames = $derived(
    breakdown.filter((g) => !g.isFinal && isWithinLiveWindow(kickoffMs(g), now))
  );
  const liveWindowActive = $derived(liveWindowGames.length > 0);

  const liveQuery = createQuery(() => ({
    queryKey: queryKeys.liveScores(),
    queryFn: () => fetchLiveScores(fetch),
    enabled: liveWindowActive,
    // Stop repolling once every in-window game reports `final`, and just hold the unofficial
    // score until grading replaces it (#831). Landing in the gap between the final whistle and
    // the grade cron therefore costs ONE fetch, not 25s polling for the rest of the window.
    refetchInterval: (query) =>
      allGamesFinal(
        liveWindowGames.map((g) => g.gameId),
        query.state.data?.scores ?? {}
      )
        ? false
        : LIVE_POLL_MS,
    refetchOnWindowFocus: true,
    staleTime: 0,
    gcTime: 60_000
  }));

  const liveScores = $derived(liveQuery.data?.scores ?? {});
  const liveFetchedAt = $derived(liveQuery.data?.fetchedAt ?? null);

  // Every in-window game has reported `final`: the slate is over, we've stopped polling, and
  // the scores in hand are the last word until grading replaces them (#831).
  const liveSettled = $derived(
    liveWindowActive &&
      allGamesFinal(
        liveWindowGames.map((g) => g.gameId),
        liveQuery.data?.scores ?? {}
      )
  );

  // Stale once the honest data age crosses the threshold, or on an errored/never-arrived fetch
  // while a game is live. A settled feed is exempt (#831) — staleness exists to stop the board
  // passing a *moving* number off as current, and a final score does not move; ageing it out
  // would grey a correct answer into "Stale · reconnecting" precisely because stopping the poll
  // is what makes `fetchedAt` cross the threshold. A quiet in-progress feed still clears, which
  // is the case #822 built this guard for.
  const liveStale = $derived.by(() => {
    if (!liveWindowActive) return false;
    if (liveSettled) return false;
    if (liveQuery.isError) return true;
    if (!liveFetchedAt) return true;
    return now - new Date(liveFetchedAt).getTime() > STALE_THRESHOLD_MS;
  });

  // Live scores only count while a game is actually in its window — outside it we fall back to
  // the pure graded weekly order rather than a lingering cached poll. The ranked board keeps
  // its last-known number through a brief stale blip (like the picks summary bar), flagging it
  // with the header stamp; the per-card cover dots vanish on stale instead (like the #386 group
  // dots) — see WeeklyPickCard's `liveStale` gate.
  //
  // Shared with PicksBoard via `activeLiveScores` (#822): this gate was correct here and simply
  // missing there, so it now lives in one place with the reasoning attached.
  const gatedLiveScores = $derived(activeLiveScores(liveScores, liveWindowActive));
  const standings = $derived(assembleWeeklyLiveStandings(breakdown, gatedLiveScores));
  // Show the board once at least one pick has a result (graded or live). Hidden on a
  // not-yet-started week, where every total is a flat zero.
  const showBoard = $derived(standings.some((s) => s.decided > 0));

  // The games in play lead the board, above every final and every not-yet-started game (#831).
  // Reading the *gated* scores — not the raw query — is what makes this collapse to today's
  // exact kickoff order outside the live window, so no mode flag and no new state are required.
  const orderedBreakdown = $derived(orderWeeklyBreakdown(breakdown, gatedLiveScores));
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
        settled={liveSettled}
        fetchedAt={liveFetchedAt}
        {now}
      />
    {/if}
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {#each orderedBreakdown as game (game.gameId)}
        <WeeklyPickCard {game} liveScore={gatedLiveScores[game.gameId] ?? null} {liveStale} />
      {/each}
    </div>
  {/if}
</div>

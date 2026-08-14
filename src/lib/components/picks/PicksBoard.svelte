<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { flip } from 'svelte/animate';
  import { scale } from 'svelte/transition';
  import { prefersReducedMotion } from 'svelte/motion';
  import { createQuery } from '@tanstack/svelte-query';
  import { queryKeys } from '$lib/query/keys';
  import { fetchLiveScores } from '$lib/query/fetchers';
  import {
    LIVE_POLL_MS,
    STALE_THRESHOLD_MS,
    isWithinLiveWindow,
    activeLiveScores,
    allGamesFinal
  } from '$lib/live/config';
  import { lockMotionMs } from '$lib/ui/motion';
  import { providePicksStore } from '$lib/stores/picks';
  import { favoriteSide } from '$lib/domain/spread';
  import { buildSituationalLookup } from '$lib/utils/leagueNugget';
  import type { PickGame } from '$lib/types/games';
  import type { LeagueSituationalRecord } from '$lib/types/server/league';
  import type { PickEntry, GroupPickEntry, PickStatusBoardEntry } from '$lib/types/picks';
  import type { Database } from '$lib/types/supabase';
  import type { LiveScoreEntry } from '$lib/live/types';
  import { Alert, AlertTitle, AlertDescription } from '$lib/components/ui/alert';
  import GameCard from './GameCard.svelte';
  import PicksSummaryBar from './PicksSummaryBar.svelte';
  import LockedPicksSection from './LockedPicksSection.svelte';
  import AllInDeclarations from './AllInDeclarations.svelte';
  import PicksStatusBoard from './PicksStatusBoard.svelte';
  import type { SocialComment } from '$lib/server/db/queries/getCommentsForGame';

  type Week = Database['public']['Tables']['weeks']['Row'];
  type SocialData = { comments: SocialComment[] };

  interface Props {
    week?: Week | null;
    games?: PickGame[];
    initialPicks?: Record<string, PickEntry>;
    social?: Record<string, SocialData>;
    groupPicks?: GroupPickEntry[];
    allInDeclarations?: GroupPickEntry[];
    pickStatusBoard?: PickStatusBoardEntry[];
    userId?: string | null;
    currentUserDisplayName?: string | null;
    isLastWeek?: boolean;
    finalWeekUnlimitedAllin?: boolean;
    membershipCount?: number;
    situational?: LeagueSituationalRecord[];
    showTrends?: boolean;
    /** Frozen/read-only mode (#669, ADR-0026): every action control (pick, lock, unlock,
     *  comment) stays inert and the live feed is never polled — used by the public demo, which
     *  has no write path and serves only the committed snapshot. `frozenLiveScores` substitutes
     *  for the live-scores query, and `committedGameIds` substitutes for the kickoff-vs-now split
     *  (the demo's kickoff timestamps age past "now" in real wall-clock time, but the game's
     *  frozen status must not). */
    readonly?: boolean;
    frozenLiveScores?: Record<string, LiveScoreEntry>;
    frozenLiveFetchedAt?: string | null;
    committedGameIds?: ReadonlySet<string>;
  }
  let {
    week = null,
    games = [],
    initialPicks = {},
    social = {},
    groupPicks = [],
    allInDeclarations = [],
    pickStatusBoard = [],
    userId = null,
    currentUserDisplayName = null,
    isLastWeek = false,
    finalWeekUnlimitedAllin = true,
    membershipCount = 1,
    situational = [],
    showTrends = false,
    readonly = false,
    frozenLiveScores = {},
    frozenLiveFetchedAt = null,
    committedGameIds = new Set()
  }: Props = $props();

  // Index the season's situational ATS rows once; each GameCard looks up its two quadrants.
  const trendLookup = $derived(showTrends ? buildSituationalLookup(situational) : null);

  // Pre-stage only the spread favorite (no weight), so agreeing with the favorite
  // is a single tap (the weight) and the underdog is two. A staged team alone never
  // auto-saves — a weight is still required — so nothing is saved on load and the
  // upcoming/committed split is unchanged. Pick'em / no-line games stage no team.
  function seedPicks() {
    const seededPicks = structuredClone(initialPicks);
    for (const game of games) {
      const entry = seededPicks[game.id];
      if (!entry?.selected && !entry?.lockedPick) {
        const fav = favoriteSide(game);
        seededPicks[game.id] = fav ? { ...entry, selected: { team: fav } } : { ...entry };
      }
    }
    return seededPicks;
  }
  const picks = providePicksStore(seedPicks());

  // Keep the pick controls disabled until the board mounts client-side. Before
  // hydration the handlers aren't attached, so an early tap (a real user on a
  // slow connection, or a fast E2E click) would be silently dropped. Gating on
  // `initialized` disables the controls until `onMount`, which also gives
  // Playwright an "enabled" state to wait on. (The hydration guard was lost when
  // e54e1c9 hardcoded this to `true`.)
  let initialized = $state(false);
  let now = $state(Date.now());

  let ticker: ReturnType<typeof setInterval>;

  onMount(() => {
    // A frozen/readonly board never hydrates into an interactive state and needs no 1s
    // ticker — its "now" is fixed at first render, and its committed/upcoming split comes
    // from `committedGameIds`, not a live kickoff comparison (see `readonly` prop doc above).
    if (readonly) return;
    initialized = true;
    ticker = setInterval(() => {
      now = Date.now();
    }, 1000);
  });

  onDestroy(() => clearInterval(ticker));

  function kickoffMs(g: PickGame) {
    return new Date(g.kickoff).getTime();
  }

  const upcoming = $derived(
    games
      .filter((g) =>
        readonly ? !committedGameIds.has(g.id) : !$picks[g.id]?.lockedPick && kickoffMs(g) > now
      )
      .sort((a, b) => kickoffMs(a) - kickoffMs(b))
  );

  const committed = $derived(
    games.filter((g) =>
      readonly ? committedGameIds.has(g.id) : !!$picks[g.id]?.lockedPick || kickoffMs(g) <= now
    )
  );

  // Live-derive the current user's "Who's picked" row from the local picks store so
  // locking/unlocking updates the board immediately — the server-fetched
  // `pickStatusBoard` is otherwise a static snapshot. Counts only games still open
  // (kickoff in the future): remaining picks, not missed or already-started games,
  // matching the picks_status_board RPC's own denominator. Co-members' rows stay as
  // the server snapshot (their live picks aren't visible client-side by design).
  const liveStatusBoard = $derived.by(() => {
    if (!userId) return pickStatusBoard;
    const remaining = games.filter((g) => kickoffMs(g) > now);
    const total = remaining.length;
    const mine = remaining.filter((g) => !!$picks[g.id]?.lockedPick).length;
    return pickStatusBoard.map((row) =>
      row.userId === userId
        ? { ...row, picksMade: mine, gamesAvailable: total, isComplete: mine >= total }
        : row
    );
  });

  // Routine lock/unlock micro-interaction (#478). A card leaving `upcoming` on
  // lock plays a quick shrink-fade while the survivors flip to fill the gap; the
  // reverse plays on unlock. `prefersReducedMotion` collapses the duration to 0
  // so the transition is effectively instant. The keyed `{#each}` (by `g.id`)
  // means the 1s `now` ticker can't restart an in-flight transition — only real
  // membership changes move a card.
  const motionMs = $derived(lockMotionMs(prefersReducedMotion.current));

  // --- Live Sunday sweat board (#386) -------------------------------------------------
  // Poll the self-gated pass-through only while a game is in its live window, and only when
  // the tab is visible (TanStack pauses `refetchInterval` on a backgrounded tab by default);
  // `refetchOnWindowFocus` fires one immediate refetch on refocus. Display-only — grading is
  // untouched. `['live-scores']` is not a shareable root, so it's never persisted.
  // Games the feed could still tell us something about: inside their window AND not already
  // graded. Excluding graded games is the first half of what keeps the wider 12h window (#823)
  // cheap — once the grade cron settles a game the DB has the authoritative score, so fetching
  // ESPN for it buys nothing and would only produce a live payload that must then lose to the
  // graded one anyway.
  const liveWindowGames = $derived(
    games.filter((g) => !g.finalScores && isWithinLiveWindow(kickoffMs(g), now))
  );
  const liveWindowActive = $derived(!readonly && liveWindowGames.length > 0);

  // Never polled in readonly mode (`enabled` stays false — no fetch is ever issued, per
  // ADR-0026 §4's "zero per-visitor live calls"); the frozen scores come from the snapshot.
  const liveQuery = createQuery(() => ({
    queryKey: queryKeys.liveScores(),
    queryFn: () => fetchLiveScores(fetch),
    enabled: liveWindowActive,
    // Second half of the cost bound: stop repolling once every in-window game reports `final`,
    // and just hold the unofficial score until grading replaces it. Someone landing in the gap
    // between the final whistle and the grade cron therefore costs ONE fetch, not 25s polling
    // for the rest of the window. Read through the query's own state rather than `liveQuery.data`
    // — referencing the query from inside its own options would be a cycle. The resolved value
    // (not this closure's identity) is what TanStack diffs, so re-deriving on the 1s tick does
    // not restart the interval.
    refetchInterval: (query) =>
      allGamesFinal(
        liveWindowGames.map((g) => g.id),
        query.state.data?.scores ?? {}
      )
        ? false
        : LIVE_POLL_MS,
    refetchOnWindowFocus: true,
    staleTime: 0,
    gcTime: 60_000
  }));

  // `enabled: false` stops the poll at the window edge but TanStack keeps the cached payload
  // while this component stays mounted, so reading `liveQuery.data` raw would pin the board to
  // its final poll forever — see `activeLiveScores` for the full mechanism (#822). Frozen mode
  // bypasses the gate: the demo's snapshot is the whole feed and has no window.
  const liveScores = $derived(
    readonly ? frozenLiveScores : activeLiveScores(liveQuery.data?.scores ?? {}, liveWindowActive)
  );
  const liveFetchedAt = $derived(
    readonly ? frozenLiveFetchedAt : (liveQuery.data?.fetchedAt ?? null)
  );

  // Every in-window game has reported `final`: the slate is over, we've stopped polling, and the
  // scores in hand are the last word until grading replaces them.
  const liveSettled = $derived(
    liveWindowActive &&
      allGamesFinal(
        liveWindowGames.map((g) => g.id),
        liveQuery.data?.scores ?? {}
      )
  );

  // Stale once the honest data age crosses the threshold, or on an errored/never-arrived
  // fetch while a game is live — the board stops asserting a number and shows
  // "Stale · reconnecting". Recomputes on the 1s `now` tick, so the freshness caption is live.
  // A frozen board is never stale — it has no live feed to lose.
  //
  // A settled feed is exempt (#823). Staleness exists to stop the board passing a *moving*
  // number off as current; a final score does not move, so ageing it out would grey a correct
  // answer into "Stale · reconnecting" — and, worse, it would do so by construction, because
  // stopping the poll is exactly what makes `fetchedAt` cross the threshold. A quiet
  // in-progress feed still clears, which is the case #822 built this guard for.
  const liveStale = $derived.by(() => {
    if (readonly) return false;
    if (!liveWindowActive) return false;
    if (liveSettled) return false;
    if (liveQuery.isError) return true;
    if (!liveFetchedAt) return true;
    return now - new Date(liveFetchedAt).getTime() > STALE_THRESHOLD_MS;
  });
</script>

<!-- A non-scoring round is a standing caveat, not an alert to clear (#787). It rides as a
     caption under the title rather than a full Alert card, which in the all-locked resting
     state cost three lines above the fold before anything actionable. -->
<div class="mb-4">
  <h1 class="text-2xl font-semibold">My Picks</h1>
  {#if week && week.is_scoring === false}
    <p class="mt-1 text-xs text-muted-foreground" data-testid="non-scoring-banner">
      This round doesn't count · just for fun, no effect on the season standings.
    </p>
  {/if}
</div>

{#if games.length === 0}
  <Alert>
    {#if !week}
      <AlertTitle>It's the offseason</AlertTitle>
      <AlertDescription
        >No active pick week right now. Check back when the season kicks off.</AlertDescription
      >
    {:else}
      <AlertTitle>No games scheduled yet</AlertTitle>
      <AlertDescription
        >Games for this week haven't been loaded yet — check back soon.</AlertDescription
      >
    {/if}
  </Alert>
{:else}
  <PicksSummaryBar
    {games}
    {now}
    {liveScores}
    {liveFetchedAt}
    {liveStale}
    {liveSettled}
    liveActive={liveWindowActive}
  />

  <!-- No "You're all set" card (#787): PicksSummaryBar already asserts the done-state on its
       own line, so a second card restating it just pushed the committed pick further down. -->
  {#if upcoming.length > 0}
    {#if membershipCount > 1}
      <Alert class="mt-4" data-testid="multi-group-banner">
        <AlertDescription>
          Your picks apply to all {membershipCount} of your groups.
        </AlertDescription>
      </Alert>
    {/if}
    {#if isLastWeek && finalWeekUnlimitedAllin}
      <Alert class="mt-4" data-testid="final-week-allin-banner">
        <AlertTitle>Final week — All-In unlocked</AlertTitle>
        <AlertDescription>
          This is the last week of the season. You can go All-In on every pick, not just one.
        </AlertDescription>
      </Alert>
    {/if}
    <div class="picks-board mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each upcoming as g (g.id)}
        <div
          id="game-{g.id}"
          animate:flip={{ duration: motionMs }}
          transition:scale={{ duration: motionMs, start: 0.96, opacity: 0 }}
        >
          <GameCard
            game={g}
            {games}
            {initialized}
            {isLastWeek}
            {finalWeekUnlimitedAllin}
            {trendLookup}
            {readonly}
          />
        </div>
      {/each}
    </div>
  {/if}

  <PicksStatusBoard board={liveStatusBoard} myUserId={userId} />

  <AllInDeclarations declarations={allInDeclarations} {games} myUserId={userId} />

  <LockedPicksSection
    games={committed}
    {now}
    {social}
    {groupPicks}
    {liveScores}
    {liveStale}
    {userId}
    {currentUserDisplayName}
    {readonly}
  />
{/if}

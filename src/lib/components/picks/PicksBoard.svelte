<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { providePicksStore } from '$lib/stores/picks';
  import type { PickGame } from '$lib/types/games';
  import type { PickEntry, GroupPickEntry } from '$lib/types/picks';
  import type { Database } from '$lib/types/supabase';
  import { Alert, AlertTitle, AlertDescription } from '$lib/components/ui/alert';
  import GameCard from './GameCard.svelte';
  import PicksSummaryBar from './PicksSummaryBar.svelte';
  import LockedPicksSection from './LockedPicksSection.svelte';

  type Week = Database['public']['Tables']['weeks']['Row'];

  interface Props {
    week?: Week | null;
    games?: PickGame[];
    initialPicks?: Record<string, PickEntry>;
    groupPicks?: GroupPickEntry[];
    userId?: string | null;
    isLastWeek?: boolean;
    finalWeekUnlimitedAllin?: boolean;
  }
  let {
    week = null,
    games = [],
    initialPicks = {},
    groupPicks = [],
    userId = null,
    isLastWeek = false,
    finalWeekUnlimitedAllin = true
  }: Props = $props();

  function seedPicks() {
    const seededPicks = structuredClone(initialPicks);
    for (const game of games) {
      const entry = seededPicks[game.id];
      if (!entry?.selected && !entry?.lockedPick) {
        seededPicks[game.id] = { ...entry, selected: { team: 'home', weight: 'L' } };
      }
    }
    return seededPicks;
  }
  const picks = providePicksStore(seedPicks());

  const initialized = true;
  let now = $state(Date.now());

  let ticker: ReturnType<typeof setInterval>;

  onMount(() => {
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
      .filter((g) => !$picks[g.id]?.lockedPick && kickoffMs(g) > now)
      .sort((a, b) => kickoffMs(a) - kickoffMs(b))
  );

  const committed = $derived(
    games.filter((g) => !!$picks[g.id]?.lockedPick || kickoffMs(g) <= now)
  );
</script>

<h1 class="mb-4 text-2xl font-semibold">My Picks</h1>

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
  <PicksSummaryBar {games} {now} />

  {#if upcoming.length === 0}
    <Alert class="mt-4">
      <AlertTitle>You're all set 🎉</AlertTitle>
      <AlertDescription>All picks are locked or kicked off. Nothing left to do.</AlertDescription>
    </Alert>
  {:else}
    <div class="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each upcoming as g (g.id)}
        <div id="game-{g.id}">
          <GameCard game={g} {initialized} {isLastWeek} {finalWeekUnlimitedAllin} />
        </div>
      {/each}
    </div>
  {/if}

  <LockedPicksSection games={committed} {now} {groupPicks} {userId} />
{/if}

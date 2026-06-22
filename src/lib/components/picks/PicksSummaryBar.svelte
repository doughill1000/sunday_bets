<script lang="ts">
  import { usePicksStore } from '$lib/stores/picks';
  import type { PickGame } from '$lib/types/games';

  interface Props {
    games: PickGame[];
    now: number;
  }
  let { games, now }: Props = $props();
  const picks = usePicksStore();

  function kickoffMs(g: PickGame) {
    return new Date(g.kickoff).getTime();
  }

  const lockedCount = $derived(games.filter((g) => !!$picks[g.id]?.lockedPick).length);

  const openCount = $derived(
    games.filter((g) => !$picks[g.id]?.lockedPick && kickoffMs(g) > now).length
  );

  const missedCount = $derived(
    games.filter((g) => kickoffMs(g) <= now && !$picks[g.id]?.lockedPick).length
  );

  const allInLocked = $derived(games.find((g) => $picks[g.id]?.lockedPick?.weight === 'A') ?? null);
  const allInSelected = $derived(
    !allInLocked ? (games.find((g) => $picks[g.id]?.selected?.weight === 'A') ?? null) : null
  );
  const allInTeam = $derived.by(() => {
    const g = allInLocked ?? allInSelected;
    if (!g) return null;
    const team = (allInLocked ? $picks[g.id]?.lockedPick?.team : $picks[g.id]?.selected?.team) ?? null;
    return team === 'home' ? g.home : team === 'away' ? g.away : null;
  });

  const weightCounts = $derived(
    (['L', 'M', 'H', 'A'] as const)
      .map((code) => ({
        code,
        count: games.filter((g) => $picks[g.id]?.lockedPick?.weight === code).length
      }))
      .filter((w) => w.count > 0)
  );
</script>

<div
  class="sticky top-14 z-30 -mx-4 border-b bg-background/95 backdrop-blur-sm"
  style="padding: 0.5rem max(1rem, env(safe-area-inset-right)) 0.5rem max(1rem, env(safe-area-inset-left))"
>
  <!-- Primary: what's left -->
  <div class="text-sm">
    {#if openCount > 0}
      <span class="font-semibold text-amber-600 dark:text-amber-400">{openCount} left to lock</span>
    {:else if lockedCount > 0}
      <span class="font-medium text-muted-foreground">✓ All picks locked</span>
    {:else}
      <span class="text-muted-foreground">No picks yet</span>
    {/if}
  </div>

  <!-- Detail row: quiet secondary info -->
  <div class="mt-0.5 flex items-center gap-x-2 text-xs text-muted-foreground">
    <!-- All-In -->
    {#if allInLocked}
      <span>All-In: <span class="font-medium text-foreground">{allInTeam}</span> ✓</span>
    {:else if allInSelected}
      <span class="text-amber-600 dark:text-amber-400">All-In: {allInTeam} · locks at kickoff</span>
    {:else if openCount > 0}
      <span class="text-amber-600 dark:text-amber-400">No All-In</span>
    {:else}
      <span>No All-In</span>
    {/if}

    <!-- Missed -->
    {#if missedCount > 0}
      <span aria-hidden="true">·</span>
      <span class="font-medium text-destructive">{missedCount} missed</span>
    {/if}

    <!-- Weight breakdown -->
    {#if weightCounts.length > 0}
      <span class="ml-auto flex items-center gap-2">
        {#each weightCounts as w (w.code)}
          <span>{w.code} <span class="font-semibold text-foreground">{w.count}</span></span>
        {/each}
      </span>
    {/if}
  </div>
</div>

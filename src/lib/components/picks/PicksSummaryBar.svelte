<script lang="ts">
  import { usePicksStore } from '$lib/stores/picks';
  import { kickoffPassed } from '$lib/domain/rules';
  import { WEIGHTS } from '$lib/types/domain';
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

  function countdown(ms: number): string {
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ${s % 60}s`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ${m % 60}m`;
    return `${Math.floor(h / 24)}d ${h % 24}h`;
  }

  const lockedCount = $derived(games.filter((g) => !!$picks[g.id]?.lockedPick).length);

  const openCount = $derived(
    games.filter((g) => !$picks[g.id]?.lockedPick && kickoffMs(g) > now).length
  );

  const nextDeadline = $derived(
    games
      .filter((g) => !$picks[g.id]?.lockedPick && kickoffMs(g) > now)
      .map((g) => kickoffMs(g))
      .sort((a, b) => a - b)[0] ?? null
  );

  const allInLocked = $derived(games.find((g) => $picks[g.id]?.lockedPick?.weight === 'A') ?? null);
  const allInSelected = $derived(
    !allInLocked ? (games.find((g) => $picks[g.id]?.selected?.weight === 'A') ?? null) : null
  );

  const weightCounts = $derived(
    Object.values(WEIGHTS)
      .filter((w) => w !== WEIGHTS.A)
      .map((_, i) => {
        const code = (['L', 'M', 'H'] as const)[i];
        return {
          code,
          label: WEIGHTS[code].label[0],
          count: games.filter((g) => $picks[g.id]?.lockedPick?.weight === code).length
        };
      })
  );
</script>

<div
  class="sticky top-14 z-30 -mx-4 border-b bg-background/95 backdrop-blur-sm"
  style="padding: 0.5rem max(1rem, env(safe-area-inset-right)) 0.5rem max(1rem, env(safe-area-inset-left))"
>
  <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
    <!-- Next lock countdown -->
    <div class="flex items-center gap-1">
      {#if nextDeadline}
        <span class="text-muted-foreground">Next lock:</span>
        <span class="font-semibold tabular-nums">{countdown(nextDeadline - now)}</span>
      {:else if openCount === 0 && lockedCount > 0}
        <span class="text-muted-foreground">All picks locked</span>
      {/if}
    </div>

    <!-- Picks made -->
    <div class="flex items-center gap-1">
      <span class="font-semibold">{lockedCount}/{games.length}</span>
      <span class="text-muted-foreground">locked</span>
      {#if openCount > 0}
        <span
          class="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
        >
          ⚠ {openCount} not locked
        </span>
      {/if}
    </div>

    <!-- All-In -->
    <div class="flex items-center gap-1">
      {#if allInLocked}
        <span class="font-semibold text-primary">All-In</span>
        <span class="text-muted-foreground">
          {$picks[allInLocked.id]?.lockedPick?.team === 'home'
            ? allInLocked.home
            : allInLocked.away} ✓</span
        >
      {:else if allInSelected}
        <span class="font-semibold text-amber-600 dark:text-amber-400">All-In</span>
        <span class="text-xs text-muted-foreground">(not locked yet)</span>
      {:else}
        <span class="text-muted-foreground">No All-In</span>
      {/if}
    </div>

    <!-- Weight breakdown -->
    <div class="ml-auto flex items-center gap-2">
      {#each weightCounts as w (w.code)}
        <span class="text-muted-foreground"
          >{w.label}:<span class="ml-0.5 font-semibold text-foreground">{w.count}</span></span
        >
      {/each}
    </div>
  </div>
</div>

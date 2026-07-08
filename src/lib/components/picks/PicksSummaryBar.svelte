<script lang="ts">
  import { usePicksStore } from '$lib/stores/picks';
  import { findAllInHolder, pickStatus } from '$lib/domain/rules';
  import { WEIGHTS } from '$lib/domain/scoring';
  import type { WeightCode } from '$lib/types/domain';
  import type { PickGame } from '$lib/types/games';

  interface Props {
    games: PickGame[];
    now: number;
  }
  let { games, now }: Props = $props();
  const picks = usePicksStore();

  const statuses = $derived(games.map((g) => pickStatus($picks[g.id], g.kickoff, now)));
  const savedCount = $derived(statuses.filter((s) => s === 'saved').length);
  const openCount = $derived(statuses.filter((s) => s === 'open').length);
  const missedCount = $derived(statuses.filter((s) => s === 'missed').length);

  // The week's single All-In, saved or staged (locked takes precedence).
  const allIn = $derived(findAllInHolder(games, $picks));
  const allInTeam = $derived(
    allIn ? (allIn.team === 'home' ? allIn.game.home : allIn.game.away) : null
  );

  const weightCounts = $derived(
    (Object.keys(WEIGHTS) as WeightCode[])
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
  <!-- Primary: saved/total counter + status -->
  <div class="flex items-center gap-2 text-sm">
    <span class="font-semibold" data-testid="saved-counter">{savedCount}/{games.length} saved</span>
    {#if openCount > 0}
      <span class="text-warning" data-testid="open-count">· {openCount} to pick</span>
    {:else if savedCount > 0}
      <span class="text-muted-foreground">✓ All saved</span>
    {/if}
  </div>

  <!-- Detail row: quiet secondary info -->
  <div class="mt-0.5 flex items-center gap-x-2 text-xs text-muted-foreground">
    <!-- All-In -->
    {#if allIn?.locked}
      <span data-testid="all-in-summary"
        >All-In: <span class="font-medium text-foreground">{allInTeam}</span> ✓</span
      >
    {:else if allIn}
      <span class="text-warning" data-testid="all-in-summary"
        >All-In: {allInTeam} · not locked in yet</span
      >
    {:else if openCount > 0}
      <span class="text-warning" data-testid="all-in-summary">No All-In</span>
    {:else}
      <span data-testid="all-in-summary">No All-In</span>
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

<script lang="ts">
  import { usePicksStore } from '$lib/stores/picks';
  import { findAllInHolder, pickStatus } from '$lib/domain/rules';
  import { WEIGHTS } from '$lib/domain/scoring';
  import type { WeightCode } from '$lib/types/domain';
  import type { PickGame } from '$lib/types/games';

  // The sticky week summary: how much of the slate you've committed, and where the All-In sits.
  // The live "week so far" row and its freshness stamp left with the rest of the #386 sweat
  // layer (#832) — `/week` owns that, and the handoff strip below carries the underway counts
  // (including missed) so this bar isn't restating them one line above.
  interface Props {
    games: PickGame[];
    now: number;
    /** Frozen/readonly board (#669, #833): the board's own started set replaces the wall-clock
     *  kickoff comparison, so the demo's aged-out timestamps can't report its one still-open
     *  game as missed. `null` on a real board, which compares against `now`. */
    startedIds?: ReadonlySet<string> | null;
  }
  let { games, now, startedIds = null }: Props = $props();
  const picks = usePicksStore();

  const statuses = $derived(
    games.map((g) =>
      pickStatus($picks[g.id], g.kickoff, now, startedIds ? startedIds.has(g.id) : undefined)
    )
  );
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
      <!-- Carries the done-state the standalone "You're all set" card used to announce (#787).
           `openCount === 0` is exactly `upcoming.length === 0` (pickStatus: a game is 'open'
           iff it's unlocked with a future kickoff), so this fires on the same condition the
           card did. Stays muted when picks were missed, so a clean-sweep green never sits
           above the destructive "N missed" the handoff strip reports. -->
      <span class={missedCount > 0 ? 'text-muted-foreground' : 'text-success'} data-testid="all-set"
        >✓ All set</span
      >
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

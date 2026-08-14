<script lang="ts">
  import { fly, scale } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
  import { prefersReducedMotion } from 'svelte/motion';
  import { lockMotionMs } from '$lib/ui/motion';
  import { usePicksStore } from '$lib/stores/picks';
  import { unlockPick as unlockPickApi } from '$lib/api/picks';
  import { signedSpreadForTeam } from '$lib/domain/spread';
  import { toast } from 'svelte-sonner';
  import type { PickGame } from '$lib/types/games';
  import FormNote from '$lib/components/FormNote.svelte';

  // Locked in, still changeable — every game here is pre-kickoff by construction (#832). The
  // board hands over only `!started && lockedPick` games; anything that has kicked off left the
  // page for the handoff strip, taking the live chip, the graded row, the revealed group picks,
  // the comments and the missed badge with it. What remains is the one thing this section was
  // always for: your commitments, and the way back out of them before kickoff.
  interface Props {
    games: PickGame[];
    /** Frozen/read-only mode (#669) — see `PicksBoard`'s `readonly` doc; hides the Unlock
     *  action, which would otherwise call the real unlock RPC. */
    readonly?: boolean;
  }
  let { games, readonly = false }: Props = $props();
  const picks = usePicksStore();

  // Enter/exit duration for the committed row as a pick lands here on lock (or
  // leaves on unlock). Matches the exit on the upcoming card in PicksBoard;
  // `prefersReducedMotion` collapses it to 0 (instant). The keyed `{#each}` (by
  // `g.id`) keeps a re-render from restarting a row's in-flight transition.
  // See `$lib/ui/motion` and issue #478.
  const motionMs = $derived(lockMotionMs(prefersReducedMotion.current));

  // Default open (most people want to glance at their locked picks right after
  // making them), and user intent from there on.
  let sectionOpen = $state(true);

  async function onEdit(g: PickGame) {
    const res = await unlockPickApi(g.id);
    if (!res.ok) {
      toast.error('Unlock failed');
      return;
    }
    picks.update((s) => ({
      ...s,
      [g.id]: { ...(s[g.id] ?? {}), lockedPick: undefined }
    }));
    requestAnimationFrame(() => {
      document
        .getElementById(`game-${g.id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
</script>

{#if games.length > 0}
  <details bind:open={sectionOpen} class="group mt-4" data-testid="committed-section">
    <summary
      data-testid="committed-summary"
      class="flex cursor-pointer list-none items-center gap-2 rounded-lg px-1 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase select-none hover:text-foreground"
    >
      <svg
        class="size-4 transition-transform group-open:rotate-90"
        viewBox="0 0 16 16"
        fill="currentColor"
      >
        <path d="M6 4l4 4-4 4V4z" />
      </svg>
      <!-- The count moved out of the visible label (#787) but has to stay in the accessible
           name — "Committed" alone doesn't say what it counts. The separator is `&nbsp;`
           because Svelte trims leading whitespace inside an element, which would otherwise
           announce this as "Committedpicks (1)". -->
      Committed<span class="sr-only">&nbsp;picks ({games.length})</span>
    </summary>

    <div class="mt-1 divide-y rounded-lg border">
      {#each games as g (g.id)}
        {@const entry = $picks[g.id]}
        {@const lp = entry?.lockedPick}
        <div
          class="px-3 py-2 text-sm"
          data-testid="committed-row"
          data-game-id={g.id}
          transition:fly={{ duration: motionMs, y: -6 }}
        >
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium" data-testid="committed-matchup">
                {g.away} @ {g.home}
              </p>
              {#if lp}
                <p class="truncate text-xs text-muted-foreground" data-testid="committed-detail">
                  {lp.team === 'home' ? g.home : g.away}{signedSpreadForTeam(g, lp.team)}
                  · {lp.weight}
                </p>
              {/if}
              {#if entry?.saveError}
                <FormNote kind="warning" text={entry.saveError} class="mt-1 px-2 py-1" />
              {/if}
            </div>

            <div class="flex shrink-0 items-center gap-2">
              <!-- Status, not a control (#787). This used to be a filled `Badge variant="secondary"`
                   sitting beside a muted ghost button, so the element you *can't* press outweighed
                   the one you can, and the twin lock emoji made the pair read as a segmented
                   toggle. Flat text leaves Unlock as the only bordered thing on the row
                   (DESIGN.md principle 5: keep `status` and `actionable` visually distinct). -->
              <span
                class="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"
                in:scale={{ duration: motionMs, start: 0.85, opacity: 1, easing: backOut }}
              >
                <span aria-hidden="true">🔒</span> Locked
              </span>
              {#if !readonly}
                <button
                  class="rounded border px-2 py-0.5 text-xs font-medium text-foreground underline-offset-2 hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                  data-testid="unlock-pick"
                  onclick={() => onEdit(g)}
                >
                  Unlock
                </button>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>
  </details>
{/if}

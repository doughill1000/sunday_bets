<script lang="ts">
  import type { PickGame } from '$lib/types/games';
  import { usePicksStore, lockPick as savePick, clearPick } from '$lib/stores/picks';
  import { Button } from '$lib/components/ui/button';
  import { toast } from 'svelte-sonner';

  interface Props {
    game: PickGame;
    started?: boolean;
    /** False when the game has no posted line (#802) — nothing can be locked in yet. */
    lined?: boolean;
  }
  let { game, started = false, lined = true }: Props = $props();
  const picks = usePicksStore();

  const entry = $derived($picks[game.id] ?? {});
  const staged = $derived(entry.selected);
  const saveState = $derived(entry.saveState);
  // Lock in enables only once both halves are staged, the game hasn't started, and there
  // is a line to pick against — the server would refuse an unlined game outright (#802).
  const canLock = $derived(!started && lined && !!staged?.team && !!staged?.weight);
  const hasPick = $derived(!!staged?.team || !!staged?.weight);

  async function onLock() {
    const res = await savePick(game.id, picks);
    if (!res.ok) toast.error(res.reason ?? 'Couldn’t lock in');
  }

  function onClear() {
    if (started) return;
    clearPick(game.id, picks);
  }
</script>

<div class="mt-1 space-y-1.5">
  {#if !started && hasPick}
    <div class="flex justify-end">
      <button
        type="button"
        class="rounded-md px-1.5 py-0.5 text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        data-testid="clear-pick"
        onclick={onClear}
      >
        Clear pick
      </button>
    </div>
  {/if}

  <Button
    class={`lock-btn h-10 w-full text-base font-semibold transition-shadow enabled:shadow-lg enabled:shadow-ember/20 enabled:hover:shadow-ember/30 disabled:opacity-100 ${
      saveState === 'saving' ? 'saving' : ''
    }`}
    data-testid="lock-in"
    onclick={onLock}
    disabled={!canLock || saveState === 'saving'}
  >
    {saveState === 'saving' ? 'Locking in…' : 'Lock in'}
  </Button>

  <div aria-live="polite" class="min-h-[1rem] text-xs">
    {#if saveState === 'error'}
      {#if lined}
        <span class="text-destructive">Couldn’t lock in — tap Lock in to retry.</span>
      {:else}
        <!-- Retrying is guaranteed to fail while the line is missing, so don't invite it. -->
        <span class="text-muted-foreground">
          Couldn’t lock in — the line isn’t posted yet. Try again once it’s up.
        </span>
      {/if}
    {/if}
  </div>
</div>

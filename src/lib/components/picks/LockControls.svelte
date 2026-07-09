<script lang="ts">
  import type { PickGame } from '$lib/types/games';
  import { usePicksStore, lockPick as savePick, clearPick } from '$lib/stores/picks';
  import { Button } from '$lib/components/ui/button';
  import { toast } from 'svelte-sonner';

  interface Props {
    game: PickGame;
    started?: boolean;
  }
  let { game, started = false }: Props = $props();
  const picks = usePicksStore();

  const entry = $derived($picks[game.id] ?? {});
  const staged = $derived(entry.selected);
  const saveState = $derived(entry.saveState);
  // Lock in enables only once both halves are staged (and the game hasn't started).
  const canLock = $derived(!started && !!staged?.team && !!staged?.weight);
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
  <Button
    class="h-10 w-full text-base font-semibold transition-shadow enabled:bg-ember enabled:shadow-lg enabled:shadow-ember/40 enabled:hover:shadow-ember/60"
    data-testid="lock-in"
    onclick={onLock}
    disabled={!canLock || saveState === 'saving'}
  >
    {saveState === 'saving' ? 'Locking in…' : 'Lock in'}
  </Button>

  <div class="flex min-h-[1.25rem] items-center justify-between gap-2 text-xs">
    <div aria-live="polite" class="min-w-0">
      {#if saveState === 'error'}
        <span class="text-destructive">Couldn’t lock in — tap Lock in to retry.</span>
      {/if}
    </div>

    {#if !started && hasPick}
      <button
        type="button"
        class="shrink-0 rounded-md border border-border/70 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:bg-muted/40 hover:text-foreground"
        data-testid="clear-pick"
        onclick={onClear}
      >
        Clear pick
      </button>
    {/if}
  </div>
</div>

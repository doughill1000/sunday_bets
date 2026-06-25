<script lang="ts">
  import type { PickGame } from '$lib/types/games';
  import { usePicksStore, lockPick as savePick, clearPick } from '$lib/stores/picks';
  import { unlockPick as unlockPickApi } from '$lib/api/picks';
  import { toast } from 'svelte-sonner';

  interface Props {
    game: PickGame;
    started?: boolean;
  }
  let { game, started = false }: Props = $props();
  const picks = usePicksStore();

  const entry = $derived($picks[game.id] ?? {});
  const saveState = $derived(entry.saveState);
  const hasPick = $derived(
    !!entry.selected?.team || !!entry.selected?.weight || !!entry.lockedPick
  );

  async function onRetry() {
    const res = await savePick(game.id, picks);
    if (!res.ok) toast.error(res.reason ?? 'Couldn’t save');
  }

  async function onClear() {
    if (started) return;
    // Only the server holds a row once a pick is saved; a purely-staged pick is local.
    if (entry.lockedPick) {
      const res = await unlockPickApi(game.id);
      if (!res.ok) {
        toast.error('Couldn’t clear pick');
        return;
      }
    }
    clearPick(game.id, picks);
  }
</script>

<div class="mt-1 flex min-h-[1.5rem] items-center justify-between gap-2 text-xs">
  <div aria-live="polite" class="min-w-0">
    {#if saveState === 'saving'}
      <span class="text-muted-foreground">Saving…</span>
    {:else if saveState === 'error'}
      <span class="text-destructive">
        Couldn’t save —
        <button
          type="button"
          class="font-semibold underline underline-offset-2 hover:no-underline"
          onclick={onRetry}>Retry</button
        >
      </span>
    {/if}
  </div>

  {#if !started && hasPick}
    <button
      type="button"
      class="shrink-0 rounded px-2 py-0.5 text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      onclick={onClear}
    >
      Clear pick
    </button>
  {/if}
</div>

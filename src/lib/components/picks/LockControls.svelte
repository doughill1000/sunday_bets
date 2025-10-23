<script lang="ts">
  import type { UIGame } from '$lib/types/ui';
  import { picks } from '$lib/stores/picks';
  import { toast } from 'svelte-sonner';
  import { lockPick as lockPickApi, unlockPick as unlockPickApi } from '$lib/api/picks';
  import { Button } from '$lib/components/ui/button';
  import { canUseAllInRule } from '$lib/domain/rules';

  export let game: UIGame;
  export let initialized = false;
  export let started = false;
  export let locked = false;

  async function onLock() {
    const entry = $picks[game.id] ?? {};
    const team = entry.selected?.team ?? entry.lockedPick?.team;
    const weight = entry.selected?.weight ?? entry.lockedPick?.weight;
    if (!team || !weight) {
      toast.error('Pick a team and weight first.');
      return;
    }

    const res = await lockPickApi(game.id, team, weight);
    if (!res.ok) {
      toast.error(res.reason ?? 'Lock failed');
      return;
    }
    picks.update((s) => ({
      ...s,
      [game.id]: { ...(s[game.id] ?? {}), lockedPick: { team, weight } }
    }));
  }

  async function onUnlock() {
    const res = await unlockPickApi(game.id);
    if (!res.ok) {
      toast.error('Unlock failed');
      return;
    }
    picks.update((s) => ({
      ...s,
      [game.id]: { ...(s[game.id] ?? {}), lockedPick: undefined }
    }));
  }
</script>

<div class="mt-1 flex gap-2">
  {#if locked}
    <Button
      class="h-10 w-full font-semibold
              border-4 border-white/80 dark:border-white/60    
             shadow-sm hover:shadow border-2 transition
             focus-visible:ring-2"
      variant="outline"
      onclick={onUnlock}
      disabled={started}
    >
      🔓 Unlock
    </Button>
  {:else}
    <Button
      class="h-10 w-full font-semibold"
      onclick={onLock}
      disabled={!initialized ||
        !$picks[game.id]?.selected ||
        ($picks[game.id]?.selected?.weight === 'A' && !canUseAllInRule(game.id, $picks)) ||
        started}
    >
      Lock Pick
    </Button>
  {/if}
</div>

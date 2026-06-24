<script lang="ts">
  import { usePicksStore } from '$lib/stores/picks';
  import { unlockPick as unlockPickApi } from '$lib/api/picks';
  import { signedSpreadForTeam } from '$lib/domain/spread';
  import { toast } from 'svelte-sonner';
  import type { PickGame } from '$lib/types/games';
  import type { GroupPickEntry } from '$lib/types/picks';
  import RevealedGroupPicks from './RevealedGroupPicks.svelte';

  interface Props {
    games: PickGame[];
    now: number;
    groupPicks?: GroupPickEntry[];
    userId?: string | null;
  }
  let { games, now, groupPicks = [], userId = null }: Props = $props();
  const picks = usePicksStore();

  function kickoffMs(g: PickGame) {
    return new Date(g.kickoff).getTime();
  }

  const hasMissed = $derived(games.some((g) => kickoffMs(g) <= now && !$picks[g.id]?.lockedPick));

  function picksForGame(gameId: string) {
    return groupPicks.filter((p) => p.gameId === gameId);
  }

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
  <details open={hasMissed} class="group mt-4">
    <summary
      class="flex cursor-pointer select-none list-none items-center gap-2 rounded-lg px-1 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <svg
        class="size-4 transition-transform group-open:rotate-90"
        viewBox="0 0 16 16"
        fill="currentColor"
      >
        <path d="M6 4l4 4-4 4V4z" />
      </svg>
      {games.length} committed pick{games.length === 1 ? '' : 's'}
      {#if hasMissed}
        <span
          class="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive"
          >missed</span
        >
      {/if}
    </summary>

    <div class="mt-1 divide-y rounded-lg border">
      {#each games as g (g.id)}
        {@const entry = $picks[g.id]}
        {@const started = kickoffMs(g) <= now}
        {@const lp = entry?.lockedPick}
        <div class="px-3 py-2 text-sm">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium">{g.away} @ {g.home}</p>
              {#if lp}
                <p class="truncate text-xs text-muted-foreground">
                  {lp.team === 'home' ? g.home : g.away}{signedSpreadForTeam(g, lp.team)}
                  · {lp.weight}
                </p>
              {:else}
                <p class="text-xs font-medium text-destructive">No pick recorded</p>
              {/if}
            </div>

            <div class="flex shrink-0 items-center gap-2">
              {#if started}
                <span class="text-xs text-muted-foreground">⏱ Kicked off</span>
              {:else}
                <span class="text-xs text-primary">🔒 Locked</span>
                <button
                  class="rounded px-2 py-0.5 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  onclick={() => onEdit(g)}
                >
                  Edit
                </button>
              {/if}
            </div>
          </div>

          {#if started && userId}
            <RevealedGroupPicks picks={picksForGame(g.id)} myUserId={userId} />
          {/if}
        </div>
      {/each}
    </div>
  </details>
{/if}

<script lang="ts">
  import PlayerPickCell from './PlayerPickCell.svelte';
  import { shortName } from '$lib/utils/user';
  import type { PickCell, PlayerRow, WeekTableGame } from '$lib/types/server/leaderboard';

  export let players: PlayerRow[] = [];
  export let games: WeekTableGame[] = [];
  export let cells: Record<string, Record<string, PickCell>> = {};

  // pass both templates from parent
  export let gridTemplate: string; // mobile
  export let gridTemplateLg: string; // md+
</script>

<div class="overflow-x-auto">
  <div
    class="weekly-grid grid items-start gap-2 md:gap-3"
    style={`--gtc:${gridTemplate}; --gtc-lg:${gridTemplateLg};`}
  >
    <!-- header -->
    <div
      class="pr-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase md:text-xs"
    >
      Game
    </div>
    {#each players as p}
      <div
        class="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase md:text-xs"
      >
        <span class="md:hidden" title={p.display_name}>{shortName(p.display_name)}</span>
        <span class="hidden md:inline">{p.display_name}</span>
      </div>
    {/each}

    <!-- rows -->
    {#each games as g}
      <div class="rounded-md border p-2 md:p-3">
        <div class="truncate text-sm font-medium md:text-base">{g.label}</div>
        <div class="text-xs text-muted-foreground md:text-sm">{g.score ?? '—'}</div>
      </div>

      {#each players as p}
        <PlayerPickCell cell={cells[g.game_id]?.[p.id] ?? null} />
      {/each}
    {/each}
  </div>
</div>

<style>
  /* mobile-first */
  .weekly-grid {
    grid-template-columns: var(--gtc);
  }
  /* md+ (768px) */
  @media (min-width: 768px) {
    .weekly-grid {
      grid-template-columns: var(--gtc-lg);
    }
  }
</style>

<script lang="ts">
  import PlayerPickCell from './PlayerPickCell.svelte';
  import { shortName } from '$lib/utils/user';
  import type { PickCell, PlayerRow, WeekTableGame } from '$lib/types/server/leaderboard';

  export let players: PlayerRow[] = [];
  export let games: WeekTableGame[] = [];
  export let cells: Record<string, Record<string, PickCell>> = {};

  export let gridTemplate: string; // mobile
  export let gridTemplateLg: string; // md+
</script>

<div class="overflow-auto max-h-[70vh] w-full">
  <div
    class="weekly-grid grid items-start gap-1.5 md:gap-3"
    style={`--gtc:${gridTemplate}; --gtc-lg:${gridTemplateLg};`}
  >
    <!-- header -->
    <div
      class="sticky-col sticky top-0 left-0 z-30 pr-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase md:text-xs bg-background"
    >
      Game
    </div>
    {#each players as p}
      <div
        class="player-header sticky top-0 z-20 flex items-center justify-center px-1 py-1 text-[11px] md:text-sm font-semibold tracking-wide uppercase bg-background text-white w-full text-center"
      >
        <span class="md:hidden block truncate" title={p.display_name}
          >{shortName(p.display_name)}</span
        >
        <span class="hidden md:block truncate">{p.display_name}</span>
      </div>
    {/each}

    <!-- rows -->
    {#each games as g}
      <div class="sticky-col sticky left-0 z-10 rounded-md border bg-background p-2 md:p-3">
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
  .weekly-grid {
    grid-template-columns: var(--gtc);
    width: max-content;
    min-width: 100%;
  }
  @media (min-width: 768px) {
    .weekly-grid {
      grid-template-columns: var(--gtc-lg);
    }
  }
  .sticky-col {
    background-clip: padding-box;
  }
  .sticky-col {
    box-shadow:
      2px 0 0 var(--background),
      3px 0 4px -2px rgba(0, 0, 0, 0.15);
  }
</style>

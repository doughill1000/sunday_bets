<!-- src/lib/components/leaderboard/weekly/PlayerPickCell.svelte -->
<script lang="ts">
  import type { PickCell } from '$lib/types/server/leaderboard';
  import ResultChip from './ResultChip.svelte';
  import WeightChip from './WeightChip.svelte';

  export let cell: PickCell;
</script>

<div class="rounded-md border p-2 md:p-3">
  {#if cell && cell.team}
    <div class="flex items-start justify-between gap-2">
      <div class="flex min-w-0 items-center gap-1.5 md:gap-2">
        {#if cell.weight}
          <WeightChip weight={cell.weight} />
        {/if}
        <div class="min-w-0 leading-tight">
          <div class="truncate text-sm font-medium">{cell.team}</div>
          {#if cell.spread}
            <div class="text-[11px] text-muted-foreground md:text-xs">{cell.spread}</div>
          {/if}
        </div>
      </div>
      {#if cell.result}
        <ResultChip result={cell.result} />
      {/if}
    </div>
  {:else}
    <div class="text-sm text-muted-foreground">—</div>
  {/if}
</div>

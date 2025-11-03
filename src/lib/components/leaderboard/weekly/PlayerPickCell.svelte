<!-- src/lib/components/leaderboard/weekly/PlayerPickCell.svelte -->
<script lang="ts">
  import type { PickCell } from '$lib/types/server/leaderboard';
  import WeightChip from './WeightChip.svelte';
  export let cell: PickCell;

  // derive border tone by result
  $: borderTone =
    cell?.result === 'W'
      ? 'border-emerald-500'
      : cell?.result === 'L'
        ? 'border-rose-500'
        : cell?.result === 'P'
          ? 'border-amber-500'
          : 'border-zinc-200';
</script>

<div class={`rounded-md border ${borderTone} p-2 md:p-3`}>
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
    </div>
  {:else}
    <div class="text-sm text-muted-foreground">—</div>
  {/if}
</div>

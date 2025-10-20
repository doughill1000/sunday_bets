<script lang="ts">
  import { shortName } from '$lib/utils/user';
  export let weekNumber: number;
  export let players: { id: string; display_name: string }[] = [];
  export let totals: Record<string, number> = {};
</script>

<div class="flex w-full items-center gap-3">
  <span class="shrink-0 basis-20 text-sm font-semibold tracking-tight bg-neutral-100 dark:bg-neutral-800 rounded px-2 py-1">
    Week {weekNumber}
  </span>
  <div class="flex flex-1 flex-wrap items-center gap-2">
    {#each players as p}
      {#if totals}
        <span
          class="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] md:text-xs bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-700"
          title={`${p.display_name}: ${totals[p.id] ?? 0}`}
        >
          <span class="opacity-70">{shortName(p.display_name)}</span>
          {#if (totals[p.id] ?? 0) > 0}
            <span class="font-semibold tabular-nums text-green-600">+{totals[p.id]}</span>
          {:else if (totals[p.id] ?? 0) < 0}
            <span class="font-semibold tabular-nums text-red-600">{totals[p.id]}</span>
          {:else}
            <span class="font-semibold tabular-nums text-neutral-600 dark:text-neutral-400">0</span>
          {/if}
        </span>
      {/if}
    {/each}
  </div>
</div>

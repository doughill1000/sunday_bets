<script lang="ts">
  import { shortName } from '$lib/utils/user';
  export let weekNumber: number;
  export let players: { id: string; display_name: string }[] = [];
  export let totals: Record<string, number> = {};
  export let activeWeekNumber: number | null = null;

  const isActive = activeWeekNumber === weekNumber;

  $: validTotals = players.map(p => ({ id: p.id, v: totals[p.id] ?? 0 }));
  $: maxTotal = validTotals.length ? Math.max(...validTotals.map(t => t.v)) : 0;
  $: topIds = new Set(
    validTotals
      .filter(t => t.v === maxTotal && validTotals.some(x => x.v !== 0))
      .map(t => t.id)
  );
</script>

<div class="flex w-full items-center gap-3">
  <span
    class="relative shrink-0 basis-24 text-sm font-semibold tracking-tight rounded px-2 py-1 border
      bg-neutral-100 dark:bg-neutral-800"
    class:ring-2={isActive}
    class:ring-blue-500={isActive}
    class:dark:ring-blue-400={isActive}
    class:shadow-md={isActive}
    class:border-blue-500={isActive}
    aria-current={isActive ? 'true' : 'false'}
  >
    Week {weekNumber}
    {#if isActive}
      <span
        class="absolute -top-1 -right-1 rounded bg-blue-600 text-white text-[10px] px-1 py-[2px] leading-none shadow"
        aria-label="Active week"
      >ACTIVE</span>
    {/if}
  </span>

  <div class="flex flex-1 flex-wrap items-center gap-2">
    {#each players as p}
      <span
        class="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] md:text-xs
          bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-700"
        class:outline={topIds.has(p.id)}
        class:outline-1={topIds.has(p.id)}
        class:outline-amber-400={topIds.has(p.id)}
        class:dark:outline-amber-300={topIds.has(p.id)}
        title={`${p.display_name}: ${totals[p.id] ?? 0}${topIds.has(p.id) ? ' (Top)' : ''}`}
      >
        <span class="opacity-70">{shortName(p.display_name)}</span>
        {#if (totals[p.id] ?? 0) > 0}
          <span class="font-semibold tabular-nums text-green-600">+{totals[p.id]}</span>
        {:else if (totals[p.id] ?? 0) < 0}
          <span class="font-semibold tabular-nums text-red-600">{totals[p.id]}</span>
        {:else}
          <span class="font-semibold tabular-nums text-neutral-600 dark:text-neutral-400">0</span>
        {/if}
        {#if topIds.has(p.id)}
          <span class="ml-[1px] text-amber-500" aria-hidden="true">🏆</span>
        {/if}
      </span>
    {/each}
  </div>
</div>

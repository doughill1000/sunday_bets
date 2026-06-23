<script lang="ts">
  import { shortName } from '$lib/utils/user';

  interface Props {
    weekNumber: number;
    players?: { id: string; display_name: string }[];
    totals?: Record<string, number>;
    activeWeekNumber?: number | null;
  }
  let { weekNumber, players = [], totals = {}, activeWeekNumber = null }: Props = $props();

  const isActive = $derived(activeWeekNumber === weekNumber);

  const validTotals = $derived(players.map((p) => ({ id: p.id, v: totals[p.id] ?? 0 })));
  const maxTotal = $derived(validTotals.length ? Math.max(...validTotals.map((t) => t.v)) : 0);
  const anyNonZero = $derived(validTotals.some((t) => t.v !== 0));
  const topIds = $derived(
    new Set(validTotals.filter((t) => anyNonZero && t.v === maxTotal).map((t) => t.id))
  );
</script>

<div class="flex w-full items-center gap-3">
  <span
    class="relative shrink-0 basis-24 text-sm font-semibold tracking-tight rounded px-2 py-1 border
      bg-muted"
    class:ring-2={isActive}
    class:ring-primary={isActive}
    class:shadow-md={isActive}
    class:border-primary={isActive}
    aria-current={isActive ? 'true' : 'false'}
    data-week-header
    data-active={isActive ? 'true' : 'false'}
  >
    Week {weekNumber}
    {#if isActive}
      <span
        class="absolute -top-1 -right-1 rounded bg-primary text-primary-foreground text-[10px] px-1 py-[2px] leading-none shadow"
        aria-label="Active week"
        data-active-badge>ACTIVE</span
      >
    {/if}
  </span>

  <div class="flex flex-1 flex-wrap items-center gap-1" data-week-totals>
    {#each players as p (p.id)}
      <span
        class="flex items-center gap-1 rounded px-1 py-0.5 text-[11px] md:text-xs
          bg-muted border border-border"
        class:outline={topIds.has(p.id)}
        class:outline-1={topIds.has(p.id)}
        class:outline-warning={topIds.has(p.id)}
        title={`${p.display_name}: ${totals[p.id] ?? 0}${topIds.has(p.id) ? ' (Top)' : ''}`}
        data-player-total
        data-player-id={p.id}
        data-top={topIds.has(p.id) ? 'true' : 'false'}
      >
        <span class="opacity-70" data-player-name>{shortName(p.display_name)}</span>
        {#if (totals[p.id] ?? 0) > 0}
          <span class="font-semibold tabular-nums text-success" data-total-val>+{totals[p.id]}</span
          >
        {:else if (totals[p.id] ?? 0) < 0}
          <span class="font-semibold tabular-nums text-destructive" data-total-val
            >{totals[p.id]}</span
          >
        {:else}
          <span class="font-semibold tabular-nums text-muted-foreground" data-total-val>0</span>
        {/if}
        {#if topIds.has(p.id)}
          <span class="ml-[1px] text-warning" aria-hidden="true" data-trophy>🏆</span>
        {/if}
      </span>
    {/each}
  </div>
</div>

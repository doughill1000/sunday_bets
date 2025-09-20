<script lang="ts">
  import { shortName } from '$lib/utils/user';
  export let weekNumber: number;
  export let players: { id: string; display_name: string }[] = [];
  export let totals: Record<string, number> = {};
</script>

<div class="flex w-full items-center justify-between pr-2">
  <span class="font-medium">Week {weekNumber}</span>
  <div class="ml-4 hidden flex-wrap gap-2 sm:flex">
    {#each players as p}
      <span
        class="text-[11px] text-muted-foreground md:text-xs"
        title={`${p.display_name}: ${totals[p.id] ?? 0}`}
      >
        <span>{shortName(p.display_name)}</span>
        <span class="font-medium">{totals[p.id] ?? 0}</span>
      </span>
    {/each}
  </div>
</div>

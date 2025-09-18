<script lang="ts">
  import { shortName } from '$lib/utils/user';
  export let weekNumber: number;
  export let players: { id: string; display_name: string }[] = [];
  export let totals: Record<string, number> = {};
</script>

<div class="flex w-full items-center justify-between pr-2">
  <span class="font-medium">Week {weekNumber}</span>
  <div class="ml-4 hidden sm:flex flex-wrap gap-2">
    {#each players as p}
      <span class="text-[11px] md:text-xs text-muted-foreground" title={`${p.display_name}: ${totals[p.id] ?? 0}`}>
        <span class="md:hidden">{shortName(p.display_name)}</span>
        <span class="hidden md:inline">{p.display_name}</span>:
        <span class="font-medium">{totals[p.id] ?? 0}</span>
      </span>
    {/each}
  </div>
</div>

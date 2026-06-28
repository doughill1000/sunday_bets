<script lang="ts">
  import { goto } from '$app/navigation';

  let {
    seasons,
    selected,
    paramName = 'season'
  }: {
    seasons: number[];
    selected: number;
    paramName?: string;
  } = $props();

  function onchange(e: Event) {
    const year = (e.target as HTMLSelectElement).value;
    const url = new URL(window.location.href);
    url.searchParams.set(paramName, year);
    void goto(url.toString(), { invalidateAll: true });
  }
</script>

{#if seasons.length > 1}
  <select
    class="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
    value={String(selected)}
    {onchange}
    aria-label="Select season"
  >
    {#each seasons as year (year)}
      <option value={String(year)}>{year}</option>
    {/each}
  </select>
{/if}

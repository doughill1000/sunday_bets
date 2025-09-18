<!-- src/lib/components/leaderboard/weekly/ResultChip.svelte -->
<script lang="ts">
  import type { GameResult } from '$lib/types/domain';

  export let result: GameResult;

  const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium';
  const cls = (r: typeof result) =>
    r === 'W'
      ? 'bg-emerald-600/10 text-emerald-700 ring-1 ring-emerald-600/20'
      : r === 'L'
        ? 'bg-rose-600/10 text-rose-700 ring-1 ring-rose-600/20'
        : r === 'P'
          ? 'bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20'
          : 'bg-zinc-500/10 text-zinc-700 ring-1 ring-zinc-500/20';
</script>

{#if result}
  <span class={`${base} ${cls(result)}`}>{result}</span>
{/if}

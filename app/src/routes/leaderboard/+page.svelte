<script lang="ts">
  type Row = { user: string; weekDelta: number; seasonTotal: number; rank: number };
  const rows: Row[] = [
    { user: 'Alice', rank: 1, weekDelta: 8, seasonTotal: 42 },
    { user: 'Bob', rank: 2, weekDelta: 3, seasonTotal: 36 },
    { user: 'You', rank: 3, weekDelta: -1, seasonTotal: 31 }
  ];
</script>

<h1 class="h3 mb-4">Leaderboard</h1>

<div class="overflow-x-auto">
  <table class="min-w-full text-sm">
    <thead class="text-left opacity-70">
      <tr
        ><th class="py-2 pr-4">Rank</th><th class="py-2 pr-4">Player</th><th class="py-2 pr-4"
          >Δ (wk)</th
        ><th class="py-2">Total</th></tr
      >
    </thead>
    <tbody>
      {#each rows as r}
        <tr class="border-t border-surface-600/20">
          <td class="py-2 pr-4">{r.rank}</td>
          <td class="py-2 pr-4">{r.user}</td>
          <td class="py-2 pr-4">{r.weekDelta}</td>
          <td class="py-2">{r.seasonTotal}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

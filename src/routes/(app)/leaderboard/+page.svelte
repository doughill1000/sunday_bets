<script lang="ts">
  import type { PageData } from './$types';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
  import LeaderboardWeekly from '$lib/components/leaderboard/weekly/LeaderboardWeekly.svelte';
  import LeaderboardTable from '$lib/components/leaderboard/LeaderboardTable.svelte';
  import {
    players,
    weeks,
    activeWeekNumber,
    currentUserId,
    weekTotals,
    tableByWeek,
    seasonYearStore,
    seasonTotalsStore
  } from '$lib/stores/leaderboard';

  let { data }: { data: PageData } = $props();

  players.set(data.players);
  weeks.set(data.weeks);
  activeWeekNumber.set(data.activeWeekNumber);
  currentUserId.set(data.currentUserId);
  weekTotals.set(data.weekTotals);
  tableByWeek.set(data.tableByWeek);
  seasonYearStore.set(data.seasonYear);
  if (Array.isArray(data.totals)) {
    seasonTotalsStore.set(data.totals);
  } else {
    console.error(
      'Expected data.totals to be an array of season totals rows, but got:',
      data.totals
    );
  }
</script>

<Tabs value="weekly" class="w-full space-y-4">
  <TabsList>
    <TabsTrigger value="weekly">Weekly</TabsTrigger>
    <TabsTrigger value="totals">Totals</TabsTrigger>
  </TabsList>

  <TabsContent value="weekly">
    <LeaderboardWeekly />
  </TabsContent>

  <TabsContent value="totals">
    <LeaderboardTable />
  </TabsContent>
</Tabs>

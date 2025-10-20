<script lang="ts">
  import type { PageData } from './$types';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
  import LeaderboardTable from '$lib/components/leaderboard/LeaderboardTable.svelte';
  import LeaderboardWeekly from '$lib/components/leaderboard/weekly/LeaderboardWeekly.svelte';
  export let data: PageData;
</script>

<Tabs value="totals" class="w-full space-y-4">
  <TabsList>
    <TabsTrigger value="totals">Season Totals</TabsTrigger>
    <TabsTrigger value="weekly">Weekly View</TabsTrigger>
  </TabsList>

  <TabsContent value="totals">
    <LeaderboardTable rows={data.totals} seasonYear={data.seasonYear} />
  </TabsContent>

  <TabsContent value="weekly">
    <LeaderboardWeekly
      seasonYear={data.seasonYear}
      players={data.players}
      weeks={data.weeks}
      tableByWeek={data.tableByWeek}
      weekTotals={data.weekTotals}
      currentUserId={data.currentUserId} />
  </TabsContent>
</Tabs>

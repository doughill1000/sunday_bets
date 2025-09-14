<script lang="ts">
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
  import LeaderboardTable from '$lib/components/leaderboard/LeaderboardTable.svelte';
  import LeaderboardWeekly from '$lib/components/leaderboard/LeaderboardWeekly.svelte';
  export let data: {
    seasonYear: number;
    totals: import('$lib/server/db/queries/leaderboard').SeasonTotalsRow[];
    weekly: import('$lib/server/db/queries/leaderboard').WeeklyCumulativeRow[];
  };
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
    <LeaderboardWeekly rows={data.weekly} seasonYear={data.seasonYear} />
  </TabsContent>
</Tabs>

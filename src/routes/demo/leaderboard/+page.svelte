<script lang="ts">
  import type { PageData } from './$types';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
  import { ACTIVE_TAB_TRIGGER_CLASS } from '$lib/ui/tabs';
  import DemoStandingsTable from '$lib/components/demo/DemoStandingsTable.svelte';
  import LeagueHonors from '$lib/components/group/LeagueHonors.svelte';

  let { data }: { data: PageData } = $props();

  let activeTab = $state<'standings' | 'alltime'>('standings');
</script>

<section
  class="mx-auto w-full max-w-screen-xl space-y-6"
  aria-labelledby="demo-leaderboard-heading"
>
  <div>
    <h1 id="demo-leaderboard-heading" class="text-3xl font-bold tracking-tight">Leaderboard</h1>
    <p class="mt-1 text-muted-foreground">{data.completedSeasonYear} season · final standings.</p>
  </div>

  <Tabs bind:value={activeTab} class="w-full space-y-4">
    <TabsList class="grid w-full grid-cols-2 sm:inline-grid sm:w-auto">
      <TabsTrigger value="standings" class={ACTIVE_TAB_TRIGGER_CLASS}>Standings</TabsTrigger>
      <TabsTrigger value="alltime" class={ACTIVE_TAB_TRIGGER_CLASS}>All-time</TabsTrigger>
    </TabsList>

    <TabsContent value="standings">
      <Card class="overflow-x-auto">
        <CardHeader>
          <CardTitle>{data.completedSeasonYear} standings</CardTitle>
        </CardHeader>
        <CardContent>
          <DemoStandingsTable
            rows={data.leaderboard.totals}
            personaUserId={data.persona.userId}
            championUserId={data.leaderboard.championUserId}
            dropActive={data.leaderboard.dropActive}
          />
        </CardContent>
      </Card>
    </TabsContent>

    <TabsContent value="alltime">
      <Card class="overflow-x-auto">
        <CardHeader>
          <CardTitle>All-time standings</CardTitle>
        </CardHeader>
        <CardContent>
          <DemoStandingsTable
            rows={data.allTime.totals}
            personaUserId={data.persona.userId}
            dropActive={data.allTime.dropActive}
            dropNote="Total drops each player's lowest week per season. W-L-P count every week."
          />
        </CardContent>
      </Card>
    </TabsContent>
  </Tabs>

  <LeagueHonors
    honors={data.honors.honors}
    badges={data.honors.badges}
    members={data.honors.members}
    currentUserId={data.persona.userId}
    seasons={[data.completedSeasonYear]}
    selectedSeason={data.completedSeasonYear}
    wrappedHref="/demo/wrapped"
  />
</section>

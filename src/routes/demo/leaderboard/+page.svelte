<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { PageData } from './$types';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
  import { ACTIVE_TAB_TRIGGER_CLASS } from '$lib/ui/tabs';
  import { LIVE_POLL_MS } from '$lib/live/config';
  import DemoStandingsTable from '$lib/components/demo/DemoStandingsTable.svelte';
  import WeeklyLiveBoard from '$lib/components/leaderboard/WeeklyLiveBoard.svelte';
  import LeagueHonors from '$lib/components/group/LeagueHonors.svelte';

  let { data }: { data: PageData } = $props();

  // Default to the live Weekly race — the sweat board is the thing to show off, and the real
  // /league defaults to Weekly during a live window too (#584). Standings/all-time are the payoff.
  let activeTab = $state<'weekly' | 'standings' | 'alltime'>('weekly');

  // Freshness anchored to page load (the demo has no live feed; #585): the board's "Updated Ns ago"
  // counts from mount and cycles under the real poll cadence, so it always reads plausibly fresh.
  let nowMs = $state(Date.now());
  let elapsed = $state(0);
  let ticker: ReturnType<typeof setInterval>;
  onMount(() => {
    ticker = setInterval(() => {
      nowMs = Date.now();
      elapsed += 1;
    }, 1000);
  });
  onDestroy(() => clearInterval(ticker));
  const pollSec = LIVE_POLL_MS / 1000;
  const fetchedAt = $derived(new Date(nowMs - (elapsed % (pollSec + 1)) * 1000).toISOString());
</script>

<section
  class="mx-auto w-full max-w-screen-xl space-y-6"
  aria-labelledby="demo-leaderboard-heading"
>
  <div>
    <h1 id="demo-leaderboard-heading" class="text-3xl font-bold tracking-tight">Leaderboard</h1>
    <p class="mt-1 text-muted-foreground">
      The live race this week, the {data.completedSeasonYear} season, and all-time.
    </p>
  </div>

  <Tabs bind:value={activeTab} class="w-full space-y-4">
    <TabsList class="grid w-full grid-cols-3 sm:inline-grid sm:w-auto">
      <TabsTrigger value="weekly" class={ACTIVE_TAB_TRIGGER_CLASS}>This week</TabsTrigger>
      <TabsTrigger value="standings" class={ACTIVE_TAB_TRIGGER_CLASS}>Standings</TabsTrigger>
      <TabsTrigger value="alltime" class={ACTIVE_TAB_TRIGGER_CLASS}>All-time</TabsTrigger>
    </TabsList>

    <TabsContent value="weekly">
      <div class="space-y-2">
        <p class="text-sm text-muted-foreground">
          Week {data.liveWeekNumber} is live — provisional standings from the games in progress. Reorders
          as covers flip and settles to the graded order once every game is final.
        </p>
        <WeeklyLiveBoard
          standings={data.weeklyStandings}
          live
          stale={false}
          {fetchedAt}
          now={nowMs}
        />
      </div>
    </TabsContent>

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

<script lang="ts">
  // Demo League (#460, ADR-0026 — extended #669): mirrors the real /league IA exactly — same
  // two self-contained tabs (Standings, Week), same season/All-time select, the credibility
  // ladder under All-time (#637), and weekly hardware on Week — reading the frozen snapshot
  // instead of live queries. The demo only ever has one completed season, so the select is a
  // plain two-option toggle rather than the real page's multi-season `seasonScopeOptions` (no
  // past seasons to list, and no `?season=` navigation — there's nothing else to navigate to).
  import type { PageData } from './$types';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
  import { ACTIVE_TAB_TRIGGER_CLASS } from '$lib/ui/tabs';
  import StandingsTable from '$lib/components/leaderboard/StandingsTable.svelte';
  import RatingLadder from '$lib/components/leaderboard/RatingLadder.svelte';
  import WeeklyHardware from '$lib/components/recap/WeeklyHardware.svelte';
  import WrappedPromo from '$lib/components/wrapped/WrappedPromo.svelte';
  import LeagueHonors from '$lib/components/group/LeagueHonors.svelte';
  import { hasRatedMember } from '$lib/domain/rating';

  let { data }: { data: PageData } = $props();

  let activeTab = $state<'standings' | 'weekly'>('standings');
  let scope = $state<'season' | 'alltime'>('season');

  const scopeValue = $derived(scope === 'alltime' ? 'alltime' : String(data.completedSeasonYear));

  function onScopeChange(e: Event) {
    scope = (e.target as HTMLSelectElement).value === 'alltime' ? 'alltime' : 'season';
  }

  // Newest-first (per `getSeasonWeeklyAwards`); the Week tab has no picker in the demo, so it
  // simply leads with the most recent graded week's hardware.
  const latestHardware = $derived(data.weeklyAwards.weeks[0] ?? null);

  const subtitle = $derived(
    scope === 'alltime'
      ? 'All-time · every season combined.'
      : `${data.completedSeasonYear} season.`
  );

  const SELECT_CLASS =
    'rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';
  const SCOPE_BAR_CLASS =
    'sticky top-14 z-30 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/75';
</script>

<svelte:head>
  <title>League | Hotshot Demo</title>
</svelte:head>

<section class="mx-auto w-full max-w-screen-xl space-y-6" aria-labelledby="demo-league-heading">
  <div>
    <h1 id="demo-league-heading" class="text-3xl font-bold tracking-tight">League</h1>
    <p class="mt-1 text-muted-foreground">{subtitle}</p>
  </div>

  {#if data.hasWrapped}
    <WrappedPromo
      groupId={data.groupId}
      seasonYear={data.completedSeasonYear}
      href="/demo/wrapped"
    />
  {/if}

  <Tabs bind:value={activeTab} class="w-full space-y-4">
    <TabsList class="grid w-full grid-cols-2 sm:inline-grid sm:w-auto">
      <TabsTrigger
        value="standings"
        data-testid="demo-league-tab-standings"
        class={ACTIVE_TAB_TRIGGER_CLASS}>Standings</TabsTrigger
      >
      <TabsTrigger
        value="weekly"
        data-testid="demo-league-tab-weekly"
        class={ACTIVE_TAB_TRIGGER_CLASS}>Week</TabsTrigger
      >
    </TabsList>

    <TabsContent value="standings" data-testid="demo-standings-panel">
      <div data-testid="demo-league-scope-bar" class={SCOPE_BAR_CLASS}>
        <span
          id="demo-league-scope-label"
          class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Season</span
        >
        <select
          class={SELECT_CLASS}
          value={scopeValue}
          onchange={onScopeChange}
          aria-labelledby="demo-league-scope-label"
          data-testid="demo-league-scope"
        >
          <option value={String(data.completedSeasonYear)}>{data.completedSeasonYear} season</option
          >
          <option value="alltime">All-time</option>
        </select>
      </div>

      <div class="mt-4">
        {#if scope === 'alltime'}
          <div class="space-y-6">
            <StandingsTable
              rows={data.allTime.totals}
              title="All-time standings"
              currentUserId={data.persona.userId}
              showDropFootnote={data.allTime.dropActive}
              dropCopy="Total drops each player's lowest week per season. W-L-P count every week."
              tableTestid="demo-alltime-table"
            />
            <!-- Nobody qualified is a legitimate state (ADR-0032 §5) — render nothing rather
                 than a card of dashes, mirroring the real /league All-time branch. -->
            {#if hasRatedMember(data.allTime.ladder)}
              <RatingLadder rows={data.allTime.ladder} currentUserId={data.persona.userId} />
            {/if}
          </div>
        {:else}
          <div class="space-y-6">
            <StandingsTable
              rows={data.leaderboard.totals}
              title="{data.completedSeasonYear} standings"
              currentUserId={data.persona.userId}
              showDropFootnote={data.leaderboard.dropActive}
              dropCopy="Total drops each player's lowest week. W-L-P count every week."
              tableTestid="demo-standings-table"
              champion={data.leaderboard.championUserId}
            />
            <LeagueHonors
              honors={data.honors.honors}
              badges={data.honors.badges}
              members={data.honors.members}
              currentUserId={data.persona.userId}
              selectedSeason={data.completedSeasonYear}
              wrappedHref="/demo/wrapped"
              recapsHref="/demo/recap"
            />
          </div>
        {/if}
      </div>
    </TabsContent>

    <TabsContent value="weekly" data-testid="demo-weekly-panel">
      {#if latestHardware}
        <WeeklyHardware
          hardware={latestHardware}
          currentUserId={data.persona.userId}
          recapHref="/demo/recap#week-{latestHardware.week_number}"
          recapLabel="Read the recap"
        />
      {:else}
        <p class="text-sm text-muted-foreground">No graded weeks yet.</p>
      {/if}
    </TabsContent>
  </Tabs>
</section>

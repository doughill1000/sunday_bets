<script lang="ts">
  // Demo League (#460, ADR-0026 — extended #669): mirrors the real /league IA exactly — the
  // same two self-contained tabs (Standings · Honors, back to two lanes since #776 promoted
  // Week to its own nav destination, /demo/week here), the honors strip above them, the
  // season/All-time select on Standings, and the trophy room (champion card + honors + shelf)
  // on Honors — reading the frozen snapshot instead of live queries. The demo only ever has
  // one completed season, so each select is a plain single-pin control rather than the real
  // page's multi-season `seasonScopeOptions` (no past seasons to list, and no `?season=`
  // navigation).
  import type { PageData } from './$types';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
  import { ACTIVE_TAB_TRIGGER_CLASS } from '$lib/ui/tabs';
  import StandingsTable from '$lib/components/leaderboard/StandingsTable.svelte';
  import RatingLadder from '$lib/components/leaderboard/RatingLadder.svelte';
  import SeasonShelf from '$lib/components/recap/SeasonShelf.svelte';
  import LeagueHonors from '$lib/components/group/LeagueHonors.svelte';
  import ChampionCard from '$lib/components/group/ChampionCard.svelte';
  import HonorsStrip from '$lib/components/group/HonorsStrip.svelte';
  import { hasRatedMember } from '$lib/domain/rating';

  let { data }: { data: PageData } = $props();

  let activeTab = $state<'standings' | 'honors'>('standings');
  let scope = $state<'season' | 'alltime'>('season');

  const scopeValue = $derived(scope === 'alltime' ? 'alltime' : String(data.completedSeasonYear));

  function onScopeChange(e: Event) {
    scope = (e.target as HTMLSelectElement).value === 'alltime' ? 'alltime' : 'season';
  }

  // The trophy room's hero (#741): the demo's one season has concluded, so the champion card
  // always renders crowned (and reigning — there is nothing newer to out-reign it).
  const demoChampion = $derived(
    data.honors.honors.trophyCase.find((c) => c.season_year === data.completedSeasonYear) ?? null
  );
  const demoChampionRecord = $derived.by(() => {
    if (!demoChampion) return null;
    const row = data.leaderboard.totals.find((t) => t.user_id === demoChampion.user_id);
    return row ? `${row.wins}-${row.losses}-${row.pushes}` : null;
  });

  const subtitle = $derived(
    scope === 'alltime' && activeTab === 'standings'
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

  <!-- The honors strip (#741): mirrors the real /league door above the tabs — the champion's
       evergreen identity, opening the Honors tab. Hidden while the room is open, as on the
       real page. -->
  {#if data.honors.honors.reigningChampion && activeTab !== 'honors'}
    <HonorsStrip
      reigningChampion={data.honors.honors.reigningChampion}
      currentUserId={data.persona.userId}
      onOpen={() => (activeTab = 'honors')}
    />
  {/if}

  <Tabs bind:value={activeTab} class="w-full space-y-4">
    <TabsList class="grid w-full grid-cols-2 sm:inline-grid sm:w-auto">
      <TabsTrigger
        value="standings"
        data-testid="demo-league-tab-standings"
        class={ACTIVE_TAB_TRIGGER_CLASS}>Standings</TabsTrigger
      >
      <!-- Two lanes since #776 — the Week tab moved to /demo/week, mirroring the real app. -->
      <TabsTrigger
        value="honors"
        data-testid="demo-league-tab-honors"
        class={ACTIVE_TAB_TRIGGER_CLASS}>Honors</TabsTrigger
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
          <!-- The demo's one season has concluded, so it takes the "Last season" pin (#737) —
               never "This season" for a finished year. -->
          <option value={String(data.completedSeasonYear)}>
            Last season · {data.completedSeasonYear}
          </option>
          <option value="alltime">All-time</option>
        </select>
      </div>

      <!-- One lane since #741, as on the real page: table then ladder — the honors moved to
           their own tab, so Standings no longer interleaves the room's content. -->
      <div class="mt-4 space-y-6">
        {#if scope === 'alltime'}
          <StandingsTable
            rows={data.allTime.totals}
            title="All-time standings"
            currentUserId={data.persona.userId}
            showDropFootnote={data.allTime.dropActive}
            dropCopy="Total drops each player's lowest week per season. W-L-P count every week."
            tableTestid="demo-alltime-table"
          />
        {:else}
          <StandingsTable
            rows={data.leaderboard.totals}
            title="{data.completedSeasonYear} standings"
            currentUserId={data.persona.userId}
            showDropFootnote={data.leaderboard.dropActive}
            dropCopy="Total drops each player's lowest week. W-L-P count every week."
            tableTestid="demo-standings-table"
            champion={data.leaderboard.championUserId}
          />
        {/if}
        <!-- Nobody qualified is a legitimate state (ADR-0032 §5) — render nothing rather
             than a card of dashes, mirroring the real /league ladder gate. -->
        {#if hasRatedMember(data.allTime.ladder)}
          <RatingLadder rows={data.allTime.ladder} currentUserId={data.persona.userId} />
        {/if}
      </div>
    </TabsContent>

    <!-- The trophy room (#741): champion card (crowned — the demo season has concluded, so
         the ember hero shows off), the honors case, and the season's weekly-hardware shelf
         absorbed from the demo recap page. -->
    <TabsContent value="honors" data-testid="demo-honors-panel">
      <div data-testid="demo-honors-scope-bar" class={SCOPE_BAR_CLASS}>
        <span
          id="demo-honors-scope-label"
          class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Season</span
        >
        <select
          class={SELECT_CLASS}
          value={String(data.completedSeasonYear)}
          aria-labelledby="demo-honors-scope-label"
          data-testid="demo-honors-season"
        >
          <option value={String(data.completedSeasonYear)}>
            Last season · {data.completedSeasonYear}
          </option>
        </select>
      </div>

      <div class="mt-4 space-y-4">
        <ChampionCard
          champion={demoChampion}
          isReigning={true}
          seasonYear={data.completedSeasonYear}
          seasonInProgress={false}
          record={demoChampionRecord}
          currentUserId={data.persona.userId}
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

        {#if data.weeklyAwards.shelf.length > 0}
          <SeasonShelf shelf={data.weeklyAwards.shelf} currentUserId={data.persona.userId} />
        {/if}
      </div>
    </TabsContent>
  </Tabs>
</section>

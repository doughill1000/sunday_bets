<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query';
  import { queryKeys } from '$lib/query/keys';
  import { fetchLeague, fetchLeagueSlate } from '$lib/query/fetchers';
  import type { LeagueCachePayload } from '$lib/query/types';
  import type { LeagueTeamAts, AtsRecord } from '$lib/types/server/league';
  import type { PageData } from './$types';
  import SeasonPicker from '$lib/components/SeasonPicker.svelte';
  import WeekSlate from '$lib/components/league/WeekSlate.svelte';
  import SortableTableHead from '$lib/components/table/SortableTableHead.svelte';
  import HotCold from '$lib/components/league/HotCold.svelte';
  import TeamGameLog from '$lib/components/league/TeamGameLog.svelte';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import SpreadBuckets from '$lib/components/league/SpreadBuckets.svelte';
  import Quadrants from '$lib/components/league/Quadrants.svelte';
  import Primetime from '$lib/components/league/Primetime.svelte';
  import Divisional from '$lib/components/league/Divisional.svelte';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
  import { ACTIVE_TAB_TRIGGER_CLASS } from '$lib/ui/tabs';
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
  } from '$lib/components/ui/card';
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
  } from '$lib/components/ui/table';
  import { formatAccuracy } from '$lib/utils/stats';
  import { coverPct } from '$lib/utils/leagueAts';

  let { data: pageData }: { data: PageData } = $props();

  // Heavy ATS payload from a cached `createQuery` keyed by season (group-independent, ADR-0017):
  // a revisit renders the last value instantly and revalidates in the background.
  // `pageData.initialLeague` is the SSR-prefetched value used as `initialData` for a
  // flash-free first paint; on a client-side cache miss the skeleton below shows.
  const leagueQuery = createQuery(() => ({
    queryKey: queryKeys.league(pageData.seasonYear),
    queryFn: () => fetchLeague(fetch, pageData.seasonYear),
    initialData: pageData.initialLeague
  }));

  // The forward-looking slate (issue #429) is week- and line-sensitive, so it always tracks
  // the *current* season's upcoming week (not the season the tables below show) and uses
  // `staleTime: 0` — every load revalidates so it reflects the current line, never a
  // superseded one. It's a distinct, non-persisted query root (ADR-0017).
  const slateQuery = createQuery(() => ({
    queryKey: queryKeys.leagueSlate(pageData.currentSeasonYear),
    queryFn: () => fetchLeagueSlate(fetch, pageData.currentSeasonYear),
    initialData: pageData.initialSlate,
    staleTime: 0
  }));

  const EMPTY: LeagueCachePayload = {
    seasonYear: 0,
    totalGames: 0,
    teams: [],
    favDogSeason: {
      weekNumber: null,
      games: 0,
      favoriteCovers: 0,
      underdogCovers: 0,
      pushes: 0
    },
    favDogByWeek: [],
    homeAway: null,
    streaks: [],
    spreadBuckets: [],
    quadrants: [],
    primetime: [],
    divisional: []
  };

  const league = $derived(leagueQuery.data ?? EMPTY);

  // Opponent short names for the drill-down game log: every opponent also appears as a team
  // here (both perspectives of each game are in league_ats_base), so this map is complete.
  const teamNamesById = $derived(new Map(league.teams.map((t) => [t.teamId, t.teamShortName])));

  // Team drill-down: one expanded row at a time (accordion), fetched lazily on open (#428).
  let expandedTeamId = $state<number | null>(null);
  function toggleTeam(teamId: number) {
    expandedTeamId = expandedTeamId === teamId ? null : teamId;
  }

  // ── Favorite / underdog cover % (pushes excluded) ──────────────────────────────
  const favSeasonPct = $derived(
    coverPct({
      wins: league.favDogSeason.favoriteCovers,
      losses: league.favDogSeason.underdogCovers
    })
  );
  const dogSeasonPct = $derived(
    coverPct({
      wins: league.favDogSeason.underdogCovers,
      losses: league.favDogSeason.favoriteCovers
    })
  );

  // ── Per-team table sorting ──────────────────────────────────────────────────────
  type SortKey = 'team' | 'cover' | 'record' | 'su' | 'games';
  type SortDirection = 'asc' | 'desc';

  const DEFAULT_SORT_DIRECTION: Record<SortKey, SortDirection> = {
    team: 'asc',
    cover: 'desc',
    record: 'desc',
    su: 'desc',
    games: 'desc'
  };
  let teamSort = $state<{ key: SortKey; direction: SortDirection }>({
    key: 'cover',
    direction: 'desc'
  });

  function setTeamSort(key: SortKey) {
    teamSort =
      teamSort.key === key
        ? { key, direction: teamSort.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: DEFAULT_SORT_DIRECTION[key] };
  }

  function compareNumber(a: number | null, b: number | null, direction: SortDirection) {
    if (a == null && b == null) return 0;
    if (a == null) return 1; // nulls last regardless of direction
    if (b == null) return -1;
    return direction === 'asc' ? a - b : b - a;
  }

  function compareRecord(a: AtsRecord, b: AtsRecord, direction: SortDirection) {
    const multiplier = direction === 'asc' ? 1 : -1;
    return (
      multiplier * (a.wins - b.wins) ||
      -multiplier * (a.losses - b.losses) ||
      multiplier * (a.pushes - b.pushes)
    );
  }

  function compareTeams(a: LeagueTeamAts, b: LeagueTeamAts) {
    const direction = teamSort.direction;
    const fallback = a.teamShortName.localeCompare(b.teamShortName);
    switch (teamSort.key) {
      case 'team':
        return direction === 'asc' ? fallback : -fallback;
      case 'cover':
        return (
          compareNumber(coverPct(a.ats), coverPct(b.ats), direction) ||
          compareNumber(a.games, b.games, 'desc') ||
          fallback
        );
      case 'su':
        return compareNumber(coverPct(a.su), coverPct(b.su), direction) || fallback;
      case 'record':
        return compareRecord(a.ats, b.ats, direction) || fallback;
      case 'games':
        return compareNumber(a.games, b.games, direction) || fallback;
    }
  }

  const sortedTeams = $derived(league.teams.toSorted(compareTeams));
</script>

{#snippet wlp(rec: AtsRecord)}
  <span class="tabular-nums">{rec.wins}-{rec.losses}-{rec.pushes}</span>
{/snippet}

{#snippet teamHead(label: string, key: SortKey, align: 'left' | 'right' = 'left')}
  <SortableTableHead
    {label}
    {align}
    direction={teamSort.key === key ? teamSort.direction : null}
    onsort={() => setTeamSort(key)}
  />
{/snippet}

{#snippet loadingState()}
  <div class="space-y-6" aria-hidden="true">
    <div class="h-40 w-full animate-pulse rounded-xl bg-muted"></div>
    <div class="h-72 w-full animate-pulse rounded-xl bg-muted"></div>
    <div class="h-40 w-full animate-pulse rounded-xl bg-muted"></div>
  </div>
{/snippet}

<!-- Teams tab: browse league ATS by team — hot/cold streaks then the full sortable table
     with its per-team game-log drill-down. Page-level teamSort / expandedTeamId $state lives
     in the script above, so sorting and an open drill-down survive a Trends→Teams round-trip. -->
{#snippet teamsView()}
  <!-- ── Hot & cold streaks ──────────────────────────────────────────────────── -->
  <HotCold streaks={league.streaks} />

  <!-- ── Per-team ATS table ──────────────────────────────────────────────────── -->
  <Card data-testid="league-team-table">
    <CardHeader>
      <CardTitle>Team ATS records</CardTitle>
      <CardDescription>
        Against-the-spread and straight-up records, with home/away and favorite/underdog splits.
      </CardDescription>
    </CardHeader>
    <CardContent class="overflow-x-auto px-2 sm:px-6">
      <Table class="text-xs sm:text-sm">
        <TableHeader>
          <TableRow>
            {@render teamHead('Team', 'team')}
            {@render teamHead('ATS', 'record')}
            {@render teamHead('Cover %', 'cover', 'right')}
            {@render teamHead('SU', 'su')}
            <TableHead>Home</TableHead>
            <TableHead>Away</TableHead>
            <TableHead>As fav</TableHead>
            <TableHead>As dog</TableHead>
            {@render teamHead('G', 'games', 'right')}
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each sortedTeams as team (team.teamId)}
            {@const expanded = expandedTeamId === team.teamId}
            <TableRow>
              <TableCell class="font-medium whitespace-nowrap" title={team.teamName}>
                <button
                  type="button"
                  class="-mx-1 flex items-center gap-1 rounded px-1 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  aria-expanded={expanded}
                  data-testid="league-team-toggle"
                  onclick={() => toggleTeam(team.teamId)}
                >
                  <ChevronRight
                    class="size-3 shrink-0 transition-transform {expanded ? 'rotate-90' : ''}"
                    aria-hidden="true"
                  />
                  {team.teamShortName}
                </button>
              </TableCell>
              <TableCell>{@render wlp(team.ats)}</TableCell>
              <TableCell class="text-right">{formatAccuracy(coverPct(team.ats))}</TableCell>
              <TableCell>{@render wlp(team.su)}</TableCell>
              <TableCell class="text-muted-foreground">{@render wlp(team.home)}</TableCell>
              <TableCell class="text-muted-foreground">{@render wlp(team.away)}</TableCell>
              <TableCell class="text-muted-foreground">{@render wlp(team.favorite)}</TableCell>
              <TableCell class="text-muted-foreground">{@render wlp(team.underdog)}</TableCell>
              <TableCell class="text-right tabular-nums">{team.games}</TableCell>
            </TableRow>
            {#if expanded}
              <TableRow data-testid="league-team-drilldown">
                <TableCell colspan={9} class="bg-muted/30 p-4">
                  <p class="mb-3 text-sm font-medium">
                    {team.teamName} — {pageData.seasonYear} game log
                  </p>
                  <TeamGameLog
                    teamId={team.teamId}
                    seasonYear={pageData.seasonYear}
                    {teamNamesById}
                  />
                </TableCell>
              </TableRow>
            {/if}
          {/each}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
{/snippet}

<!-- Trends tab: the six league-wide situational/market cuts, two-up on desktop (single
     column on mobile so the wide fav/dog table keeps its width). Each guarded component
     renders nothing when empty, so an absent cut collapses out of the grid cleanly. -->
{#snippet trendsView()}
  <div class="grid items-start gap-6 lg:grid-cols-2">
    <!-- ── Favorites vs. underdogs ─────────────────────────────────────────────── -->
    <Card data-testid="league-fav-dog">
      <CardHeader>
        <CardTitle>Favorites vs. underdogs</CardTitle>
        <CardDescription>How often the spread favorite covers, league-wide.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <dl class="grid grid-cols-2 gap-4 sm:max-w-md">
          <div>
            <dt class="text-xs font-medium text-muted-foreground">Favorites cover</dt>
            <dd class="text-3xl font-bold">{formatAccuracy(favSeasonPct)}</dd>
            <p class="text-xs text-muted-foreground">{league.favDogSeason.favoriteCovers} covers</p>
          </div>
          <div>
            <dt class="text-xs font-medium text-muted-foreground">Underdogs cover</dt>
            <dd class="text-3xl font-bold">{formatAccuracy(dogSeasonPct)}</dd>
            <p class="text-xs text-muted-foreground">{league.favDogSeason.underdogCovers} covers</p>
          </div>
        </dl>

        {#if league.favDogByWeek.length > 0}
          <div class="overflow-x-auto">
            <Table class="text-xs sm:text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Week</TableHead>
                  <TableHead class="text-right">Games</TableHead>
                  <TableHead class="text-right">Fav cover</TableHead>
                  <TableHead class="text-right">Dog cover</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {#each league.favDogByWeek as wk (wk.weekNumber)}
                  <TableRow>
                    <TableCell class="font-medium">Week {wk.weekNumber}</TableCell>
                    <TableCell class="text-right tabular-nums">{wk.games}</TableCell>
                    <TableCell class="text-right"
                      >{formatAccuracy(
                        coverPct({ wins: wk.favoriteCovers, losses: wk.underdogCovers })
                      )}</TableCell
                    >
                    <TableCell class="text-right"
                      >{formatAccuracy(
                        coverPct({ wins: wk.underdogCovers, losses: wk.favoriteCovers })
                      )}</TableCell
                    >
                  </TableRow>
                {/each}
              </TableBody>
            </Table>
          </div>
        {/if}
      </CardContent>
    </Card>

    <!-- ── Favorites by spread size (issue #426) ───────────────────────────────── -->
    <SpreadBuckets buckets={league.spreadBuckets} />

    <!-- ── Home vs. away ───────────────────────────────────────────────────────── -->
    {#if league.homeAway}
      {@const ha = league.homeAway}
      <Card data-testid="league-home-away">
        <CardHeader>
          <CardTitle>Home vs. away</CardTitle>
          <CardDescription>League-wide home and road cover rates.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl class="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <div>
              <dt class="text-xs font-medium text-muted-foreground">Home ATS cover</dt>
              <dd class="text-2xl font-bold">{formatAccuracy(coverPct(ha.home.ats))}</dd>
              <p class="text-xs text-muted-foreground">{@render wlp(ha.home.ats)}</p>
            </div>
            <div>
              <dt class="text-xs font-medium text-muted-foreground">Home win %</dt>
              <dd class="text-2xl font-bold">{formatAccuracy(coverPct(ha.home.su))}</dd>
              <p class="text-xs text-muted-foreground">straight up</p>
            </div>
            <div>
              <dt class="text-xs font-medium text-muted-foreground">Away ATS cover</dt>
              <dd class="text-2xl font-bold">{formatAccuracy(coverPct(ha.away.ats))}</dd>
              <p class="text-xs text-muted-foreground">{@render wlp(ha.away.ats)}</p>
            </div>
            <div>
              <dt class="text-xs font-medium text-muted-foreground">Away win %</dt>
              <dd class="text-2xl font-bold">{formatAccuracy(coverPct(ha.away.su))}</dd>
              <p class="text-xs text-muted-foreground">straight up</p>
            </div>
          </dl>
        </CardContent>
      </Card>
    {/if}

    <!-- ── Home/road × favorite/underdog quadrants (issue #426) ────────────────── -->
    <Quadrants quadrants={league.quadrants} />

    <!-- ── Primetime vs. daytime (issue #427) ──────────────────────────────────── -->
    <Primetime slots={league.primetime} />

    <!-- ── Divisional vs. non-divisional (issue #427) ──────────────────────────── -->
    <Divisional splits={league.divisional} />
  </div>
{/snippet}

<svelte:head>
  <title>League | Sunday Bets</title>
</svelte:head>

<section class="mx-auto w-full max-w-screen-xl space-y-6" aria-labelledby="league-heading">
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1
        id="league-heading"
        data-testid="league-heading"
        class="text-3xl font-bold tracking-tight"
      >
        League trends
      </h1>
      <p class="mt-1 text-muted-foreground">
        League-wide NFL team performance against the spread — the same for everyone.
      </p>
    </div>
    <div class="flex items-center gap-3">
      <SeasonPicker seasons={pageData.availableSeasons} selected={pageData.seasonYear} />
    </div>
  </div>

  <!-- Forward-looking slate for the current season's upcoming week (issue #429). Its own
       week-sensitive query, so it renders as a hero above the tabbed season-scoped modules. -->
  <WeekSlate
    slate={slateQuery.data ?? null}
    loading={slateQuery.isPending}
    error={slateQuery.isError}
  />

  {#if leagueQuery.isPending}
    {@render loadingState()}
  {:else if leagueQuery.isError}
    <Card class="border-dashed">
      <CardHeader>
        <CardTitle>Couldn't load league trends</CardTitle>
        <CardDescription
          >Something went wrong fetching the data. Refresh to try again.</CardDescription
        >
      </CardHeader>
    </Card>
  {:else if league.totalGames === 0}
    <Card class="border-dashed">
      <CardHeader>
        <CardTitle>No graded games for {pageData.seasonYear} yet</CardTitle>
        <CardDescription>
          Team ATS trends appear once games are graded. Try a different season above.
        </CardDescription>
      </CardHeader>
    </Card>
  {:else}
    <!-- Sample-size caveat: descriptive, not predictive. Older imported seasons (2022–24)
         have missing scores, so their totals are honestly thinner, not misleadingly complete.
         Sits above the tab bar because it applies to both Teams and Trends. -->
    <p class="text-sm text-muted-foreground">
      Descriptive trends against the closing spread, based on
      <span class="font-medium text-foreground">{league.totalGames}</span>
      scored {league.totalGames === 1 ? 'game' : 'games'} with a line this season. ATS trends are noisy
      — treat small samples with caution.
    </p>

    <!-- Season-scoped content splits into Teams (browse by team) and Trends (league-wide
         situational cuts). The live slate above stays outside the tabs; the season picker
         governs the tabbed content. Default to Teams — the densest, most-referenced view. -->
    <Tabs value="teams" class="w-full space-y-6">
      <TabsList class="grid w-full grid-cols-2 sm:inline-grid sm:w-auto">
        <TabsTrigger value="teams" class={ACTIVE_TAB_TRIGGER_CLASS}>Teams</TabsTrigger>
        <TabsTrigger value="trends" class={ACTIVE_TAB_TRIGGER_CLASS}>Trends</TabsTrigger>
      </TabsList>
      <TabsContent value="teams" class="space-y-6">{@render teamsView()}</TabsContent>
      <TabsContent value="trends" class="space-y-6">{@render trendsView()}</TabsContent>
    </Tabs>
  {/if}
</section>

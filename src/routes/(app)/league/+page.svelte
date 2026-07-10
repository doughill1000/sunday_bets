<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query';
  import { queryKeys } from '$lib/query/keys';
  import { fetchLeague, fetchLeagueSlate, fetchLeagueTrends } from '$lib/query/fetchers';
  import type { LeagueCachePayload } from '$lib/query/types';
  import type { LeagueTeamAts, AtsRecord, LeagueFavDogSplit } from '$lib/types/server/league';
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
  import { ToggleGroup, ToggleGroupItem } from '$lib/components/ui/toggle-group';
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

  // Which tab is showing. Controlled (vs. a static default) so the Trends query can lazy-load
  // only while its tab is open — the picker lives in Teams, the pinned-season data in Trends.
  let activeTab = $state('teams');

  // Trends-tab scope: 'season' (pinned to the default season, default) or 'multi' (the market
  // cuts pooled over the recent seasons, epic #424).
  let trendsScope = $state<'season' | 'multi'>('season');

  // Trends "This season" pins to `defaultSeasonYear` (most recent season with data), NOT to the
  // Teams picker's `seasonYear` — so browsing an older season in Teams leaves Trends put. On the
  // default view the two keys coincide, so this dedupes onto the Teams query (initialData shared,
  // no second fetch). Only a deliberate past-season browse makes them diverge, and then this
  // fetches lazily — gated to when the Trends tab is actually open in season scope.
  const defaultLeagueQuery = createQuery(() => ({
    queryKey: queryKeys.league(pageData.defaultSeasonYear),
    queryFn: () => fetchLeague(fetch, pageData.defaultSeasonYear),
    initialData:
      pageData.seasonYear === pageData.defaultSeasonYear ? pageData.initialLeague : undefined,
    enabled: activeTab === 'trends' && trendsScope === 'season'
  }));

  // The pooled payload is season-independent and off by default, so its query is lazy — `enabled`
  // only flips true once the user switches to multi-season, and it caches under its own
  // group-independent root thereafter (ADR-0017).
  const trendsQuery = createQuery(() => ({
    queryKey: queryKeys.leagueTrends(),
    queryFn: () => fetchLeagueTrends(fetch),
    enabled: trendsScope === 'multi'
  }));

  function onScopeChange(value: string | undefined) {
    // Ignore a toggle-off (clicking the active item) — a scope must always be selected.
    if (value === 'season' || value === 'multi') trendsScope = value;
  }

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

  // The season-scoped source for the Trends tab — the default season, decoupled from the Teams
  // picker. Equals `league` on the default view (shared query key); diverges only when Teams is
  // browsing an older season.
  const defaultLeague = $derived(defaultLeagueQuery.data ?? EMPTY);

  // Opponent short names for the drill-down game log: every opponent also appears as a team
  // here (both perspectives of each game are in league_ats_base), so this map is complete.
  const teamNamesById = $derived(new Map(league.teams.map((t) => [t.teamId, t.teamShortName])));

  // Team drill-down: one expanded row at a time (accordion), fetched lazily on open (#428).
  let expandedTeamId = $state<number | null>(null);
  function toggleTeam(teamId: number) {
    expandedTeamId = expandedTeamId === teamId ? null : teamId;
  }

  // ── Trends scope resolution ─────────────────────────────────────────────────────
  // One markup block (the six situational cards) serves both scopes; this derives the source
  // it reads from. In 'multi' the per-week fav/dog table is dropped (week 3 of 2022 ≠ week 3 of
  // 2026) by feeding it an empty array; every other card takes pooled counts as-is.
  const pooled = $derived(trendsQuery.data ?? null);
  const activeTrends = $derived(
    trendsScope === 'multi' && pooled
      ? {
          favDog: pooled.favDog,
          favDogByWeek: [] as LeagueFavDogSplit[],
          homeAway: pooled.homeAway,
          spreadBuckets: pooled.spreadBuckets,
          quadrants: pooled.quadrants,
          primetime: pooled.primetime,
          divisional: pooled.divisional
        }
      : {
          favDog: defaultLeague.favDogSeason,
          favDogByWeek: defaultLeague.favDogByWeek,
          homeAway: defaultLeague.homeAway,
          spreadBuckets: defaultLeague.spreadBuckets,
          quadrants: defaultLeague.quadrants,
          primetime: defaultLeague.primetime,
          divisional: defaultLeague.divisional
        }
  );

  // ── Favorite / underdog cover % (pushes excluded) ──────────────────────────────
  const favPct = $derived(
    coverPct({
      wins: activeTrends.favDog.favoriteCovers,
      losses: activeTrends.favDog.underdogCovers
    })
  );
  const dogPct = $derived(
    coverPct({
      wins: activeTrends.favDog.underdogCovers,
      losses: activeTrends.favDog.favoriteCovers
    })
  );

  // Human "2022–2024" (or "2024") range for the pooled caption, from the seasons actually pooled.
  const pooledRangeLabel = $derived.by(() => {
    const years = pooled?.seasonsCovered ?? [];
    if (years.length === 0) return '';
    const min = Math.min(...years);
    const max = Math.max(...years);
    return min === max ? `${min}` : `${min}–${max}`;
  });

  // ── Per-team table sorting ──────────────────────────────────────────────────────
  type SortKey = 'team' | 'cover' | 'record' | 'su';
  type SortDirection = 'asc' | 'desc';

  const DEFAULT_SORT_DIRECTION: Record<SortKey, SortDirection> = {
    team: 'asc',
    cover: 'desc',
    record: 'desc',
    su: 'desc'
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
    }
  }

  const sortedTeams = $derived(league.teams.toSorted(compareTeams));
</script>

{#snippet wlp(rec: AtsRecord)}
  <span class="tabular-nums">{rec.wins}-{rec.losses}-{rec.pushes}</span>
{/snippet}

<!-- Situational ATS splits for a team's drill-down: home/away and favorite/underdog, moved out
     of the always-visible table (which now scans on mobile without a horizontal scroll) into the
     detail view. Sourced from the in-memory team row, so it paints with no fetch. -->
{#snippet teamSplits(team: LeagueTeamAts)}
  <dl class="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
    {#each [{ label: 'Home', rec: team.home }, { label: 'Away', rec: team.away }, { label: 'As fav', rec: team.favorite }, { label: 'As dog', rec: team.underdog }] as split (split.label)}
      <div>
        <dt class="text-xs font-medium text-muted-foreground">{split.label}</dt>
        <dd class="text-sm">
          {@render wlp(split.rec)}
          <span class="text-xs text-muted-foreground">· {formatAccuracy(coverPct(split.rec))}</span>
        </dd>
      </div>
    {/each}
  </dl>
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

<!-- Teams tab panel: the season picker plus its loading/error/empty gating, wrapping the
     browse-by-team view. The picker scopes only this tab (the Trends tab pins to the default
     season), so it — and the gating that depends on the picked season — lives here, not
     page-level. This keeps a season with no graded games from blanking the whole page: only the
     Teams tab shows its empty state, and Trends stays reachable. -->
{#snippet teamsPanel()}
  <div class="flex flex-wrap items-center justify-end gap-3">
    <SeasonPicker seasons={pageData.availableSeasons} selected={pageData.seasonYear} />
  </div>

  {#if leagueQuery.isPending}
    {@render loadingState()}
  {:else if leagueQuery.isError}
    <Card class="border-dashed">
      <CardHeader>
        <CardTitle>Couldn't load team ATS records</CardTitle>
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
          Team ATS records appear once games are graded. Try a different season above.
        </CardDescription>
      </CardHeader>
    </Card>
  {:else}
    <!-- Sample-size caveat: descriptive, not predictive. Older imported seasons (2022–24) have
         missing scores, so their totals are honestly thinner, not misleadingly complete. -->
    <p class="text-sm text-muted-foreground">
      Descriptive records against the closing spread, based on
      <span class="font-medium text-foreground">{league.totalGames}</span>
      scored {league.totalGames === 1 ? 'game' : 'games'} with a line in {pageData.seasonYear}. ATS
      records are noisy — treat small samples with caution.
    </p>
    {@render teamsView()}
  {/if}
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
            </TableRow>
            {#if expanded}
              <TableRow data-testid="league-team-drilldown">
                <TableCell colspan={4} class="bg-muted/30 p-4">
                  <!-- Situational splits render instantly from the already-loaded team row (no
                       fetch), so the drill-down shows content the moment it opens; only the game
                       log below waits on the network. -->
                  {@render teamSplits(team)}
                  <p class="mt-4 mb-3 text-sm font-medium">
                    {team.teamName} — {pageData.seasonYear} game log
                  </p>
                  <TeamGameLog
                    teamId={team.teamId}
                    seasonYear={pageData.seasonYear}
                    expectedGames={team.games}
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

<!-- The six league-wide situational/market cuts, two-up on desktop (single column on mobile so
     the wide fav/dog table keeps its width). Reads `activeTrends`, so the same markup renders
     either the picked season or the pooled multi-season window. Each guarded component renders
     nothing when empty, so an absent cut collapses out of the grid cleanly. -->
{#snippet trendsGrid()}
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
            <dd class="text-3xl font-bold">{formatAccuracy(favPct)}</dd>
            <p class="text-xs text-muted-foreground">{activeTrends.favDog.favoriteCovers} covers</p>
          </div>
          <div>
            <dt class="text-xs font-medium text-muted-foreground">Underdogs cover</dt>
            <dd class="text-3xl font-bold">{formatAccuracy(dogPct)}</dd>
            <p class="text-xs text-muted-foreground">{activeTrends.favDog.underdogCovers} covers</p>
          </div>
        </dl>

        {#if activeTrends.favDogByWeek.length > 0}
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
                {#each activeTrends.favDogByWeek as wk (wk.weekNumber)}
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
    <SpreadBuckets buckets={activeTrends.spreadBuckets} />

    <!-- ── Home vs. away ───────────────────────────────────────────────────────── -->
    {#if activeTrends.homeAway}
      {@const ha = activeTrends.homeAway}
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
    <Quadrants quadrants={activeTrends.quadrants} />

    <!-- ── Primetime vs. daytime (issue #427) ──────────────────────────────────── -->
    <Primetime slots={activeTrends.primetime} />

    <!-- ── Divisional vs. non-divisional (issue #427) ──────────────────────────── -->
    <Divisional splits={activeTrends.divisional} />
  </div>
{/snippet}

<!-- Trends tab: a scope toggle above the situational/market cuts. "This season" reads the
     season-scoped payload; "Last 5 seasons" pools the market-structure biases (spread size,
     home field, favorite/underdog, primetime, divisional) over the recent seasons, where they
     have enough sample to read (epic #424). The pooled query is lazy — it only fetches on the
     first switch to multi-season. -->
{#snippet trendsView()}
  <div class="flex flex-wrap items-center justify-between gap-3">
    <ToggleGroup
      type="single"
      variant="outline"
      value={trendsScope}
      onValueChange={onScopeChange}
      data-testid="league-trends-scope"
      aria-label="Trends scope"
    >
      <ToggleGroupItem value="season" class="px-3 text-xs sm:text-sm"
        >This season ({pageData.defaultSeasonYear})</ToggleGroupItem
      >
      <ToggleGroupItem value="multi" class="px-3 text-xs sm:text-sm">Last 5 seasons</ToggleGroupItem
      >
    </ToggleGroup>

    {#if trendsScope === 'multi' && pooled && pooled.totalGames > 0}
      <p class="text-xs text-muted-foreground">
        Pooled {pooledRangeLabel} ·
        <span class="font-medium text-foreground">{pooled.totalGames}</span> games
      </p>
    {/if}
  </div>

  {#if trendsScope === 'season' && defaultLeagueQuery.isPending}
    <div class="grid items-start gap-6 lg:grid-cols-2" aria-hidden="true">
      <div class="h-48 w-full animate-pulse rounded-xl bg-muted"></div>
      <div class="h-48 w-full animate-pulse rounded-xl bg-muted"></div>
    </div>
  {:else if trendsScope === 'season' && defaultLeagueQuery.isError}
    <Card class="border-dashed">
      <CardHeader>
        <CardTitle>Couldn't load this season's trends</CardTitle>
        <CardDescription>Refresh to try again.</CardDescription>
      </CardHeader>
    </Card>
  {:else if trendsScope === 'season' && defaultLeague.totalGames === 0}
    <Card class="border-dashed">
      <CardHeader>
        <CardTitle>No trends for {pageData.defaultSeasonYear} yet</CardTitle>
        <CardDescription>
          League-wide situational cuts appear once games are graded. Try the last-5-seasons view.
        </CardDescription>
      </CardHeader>
    </Card>
  {:else if trendsScope === 'multi' && trendsQuery.isPending}
    <div class="grid items-start gap-6 lg:grid-cols-2" aria-hidden="true">
      <div class="h-48 w-full animate-pulse rounded-xl bg-muted"></div>
      <div class="h-48 w-full animate-pulse rounded-xl bg-muted"></div>
    </div>
  {:else if trendsScope === 'multi' && trendsQuery.isError}
    <Card class="border-dashed">
      <CardHeader>
        <CardTitle>Couldn't load pooled trends</CardTitle>
        <CardDescription>Switch back to this season, or refresh to try again.</CardDescription>
      </CardHeader>
    </Card>
  {:else if trendsScope === 'multi' && pooled && pooled.totalGames === 0}
    <Card class="border-dashed">
      <CardHeader>
        <CardTitle>No pooled trends yet</CardTitle>
        <CardDescription
          >Multi-season cuts appear once graded seasons are available.</CardDescription
        >
      </CardHeader>
    </Card>
  {:else}
    {@render trendsGrid()}
    {#if trendsScope === 'multi'}
      <p class="text-xs text-muted-foreground">
        Pooled across the {pooledRangeLabel} seasons to give thin situational cuts enough sample. Even
        pooled, an efficient market keeps most rates within a few points of 50% — read these as descriptive,
        not predictive. Older imported seasons (2022–24) carry a single line snapshot rather than a true
        closing line, so a pooled rate mixes the two.
      </p>
    {/if}
  {/if}
{/snippet}

<svelte:head>
  <title>League | Hotshot</title>
</svelte:head>

<section class="mx-auto w-full max-w-screen-xl space-y-6" aria-labelledby="league-heading">
  <div>
    <h1 id="league-heading" data-testid="league-heading" class="text-3xl font-bold tracking-tight">
      League trends
    </h1>
    <p class="mt-1 text-muted-foreground">
      League-wide NFL team performance against the spread — the same for everyone.
    </p>
  </div>

  <!-- Forward-looking slate for the current season's upcoming week (issue #429). Its own
       week-sensitive query, so it renders as a hero above the tabbed season-scoped modules. -->
  <WeekSlate
    slate={slateQuery.data ?? null}
    loading={slateQuery.isPending}
    error={slateQuery.isError}
  />

  <!-- Teams (browse by season, via the in-tab picker) and Trends (league-wide situational cuts,
       pinned to the default season). The tabs render unconditionally — the picker and its
       season-scoped loading/error/empty gating live inside the Teams panel — so an empty picked
       season never hides Trends. Controlled so the pinned-season Trends query loads only while
       its tab is open. Default to Teams — the densest, most-referenced view. -->
  <Tabs bind:value={activeTab} class="w-full space-y-6">
    <TabsList class="grid w-full grid-cols-2 sm:inline-grid sm:w-auto">
      <TabsTrigger value="teams" class={ACTIVE_TAB_TRIGGER_CLASS}>Teams</TabsTrigger>
      <TabsTrigger value="trends" class={ACTIVE_TAB_TRIGGER_CLASS}>Trends</TabsTrigger>
    </TabsList>
    <TabsContent value="teams" class="space-y-6">{@render teamsPanel()}</TabsContent>
    <TabsContent value="trends" class="space-y-6">{@render trendsView()}</TabsContent>
  </Tabs>
</section>

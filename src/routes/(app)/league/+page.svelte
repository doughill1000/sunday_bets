<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query';
  import { queryKeys } from '$lib/query/keys';
  import { fetchLeague, fetchLeagueSlate, fetchLeagueTrends } from '$lib/query/fetchers';
  import type { LeagueCachePayload } from '$lib/query/types';
  import type { LeagueTeamAts, AtsRecord, LeagueFavDogSplit } from '$lib/types/server/league';
  import type { PageData } from './$types';
  import SeasonPicker from '$lib/components/SeasonPicker.svelte';
  import WeekSlate from '$lib/components/league/WeekSlate.svelte';
  import HotCold from '$lib/components/league/HotCold.svelte';
  import TeamGameLog from '$lib/components/league/TeamGameLog.svelte';
  import { Button } from '$lib/components/ui/button';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import ArrowDown from '@lucide/svelte/icons/arrow-down';
  import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
  import SpreadBuckets from '$lib/components/league/SpreadBuckets.svelte';
  import Quadrants from '$lib/components/league/Quadrants.svelte';
  import Primetime from '$lib/components/league/Primetime.svelte';
  import Divisional from '$lib/components/league/Divisional.svelte';
  import MarketBends from '$lib/components/league/MarketBends.svelte';
  import CoverMeter from '$lib/components/CoverMeter.svelte';
  import { topMarketBends } from '$lib/utils/leagueBends';
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

  // ── "Where the market bends" synthesis (issue #517) ─────────────────────────────
  // The ranked favorite-cover deviations that lead the Trends tab, computed off whichever
  // scope is active. The ranking + cover math live in the pure `topMarketBends` transform.
  const bends = $derived(topMarketBends(activeTrends));

  // ── One-cut-at-a-time chip selector (issue #517) ────────────────────────────────
  // The six situational cuts move behind a chip/tab selector rendering one detail panel at a
  // time, instead of six always-open cards. Only cuts with data for the active scope get a chip.
  type CutId = 'favorites' | 'spread' | 'homeaway' | 'quadrants' | 'primetime' | 'divisional';
  const CUT_LABEL: Record<CutId, string> = {
    favorites: 'Favorites',
    spread: 'Spread size',
    homeaway: 'Home / away',
    quadrants: 'Quadrants',
    primetime: 'Primetime',
    divisional: 'Divisional'
  };
  const CUT_ORDER: CutId[] = [
    'favorites',
    'spread',
    'homeaway',
    'quadrants',
    'primetime',
    'divisional'
  ];

  const availableCuts = $derived(
    CUT_ORDER.filter((id) => {
      switch (id) {
        case 'favorites':
          return activeTrends.favDog.games > 0;
        case 'spread':
          return activeTrends.spreadBuckets.length > 0;
        case 'homeaway':
          return activeTrends.homeAway != null;
        case 'quadrants':
          return activeTrends.quadrants.length > 0;
        case 'primetime':
          return activeTrends.primetime.length > 0;
        case 'divisional':
          return activeTrends.divisional.some((d) => d.games > 0);
      }
    })
  );

  // The user's chip choice; `activeCut` falls back to the first available cut when the choice
  // is unset or its cut vanished (e.g. after a scope switch), so no $effect is needed to reset.
  let selectedCut = $state<CutId | null>(null);
  const activeCut = $derived<CutId | null>(
    selectedCut && availableCuts.includes(selectedCut) ? selectedCut : (availableCuts[0] ?? null)
  );

  // APG tabs keyboard model: arrows/Home/End move selection and focus across the chip row.
  function onCutKeydown(event: KeyboardEvent) {
    if (activeCut == null) return;
    const idx = availableCuts.indexOf(activeCut);
    let next = idx;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (idx + 1) % availableCuts.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (idx - 1 + availableCuts.length) % availableCuts.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = availableCuts.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    selectedCut = availableCuts[next];
    document.getElementById(`league-cut-tab-${selectedCut}`)?.focus();
  }

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

  // Shared column template for the team list. The header and each disclosure row are separate
  // grids (a full-width drill-down panel sits between rows, so they can't share one grid), so a
  // fixed track template — not `auto` — is what keeps their columns lined up. Team flexes; the
  // three record/percent columns are fixed-width and right-tight.
  const rowGrid = 'grid grid-cols-[minmax(0,1fr)_4.5rem_3.25rem_4.5rem] items-center gap-x-2';
</script>

{#snippet wlp(rec: AtsRecord)}
  <span class="tabular-nums">{rec.wins}-{rec.losses}-{rec.pushes}</span>
{/snippet}

<!-- Situational ATS splits for a team's drill-down: home/away and favorite/underdog, moved out
     of the always-visible list into the detail view. Sourced from the in-memory team row, so it
     paints with no fetch. Each cut is a stat tile — cover % as the headline, the W-L-P record as
     a caption beneath — matching the "Home vs away" card's language instead of mashing the two
     onto one line. Cover % is "--" for a decision-less split (e.g. a lone push), by design. -->
{#snippet teamSplits(team: LeagueTeamAts)}
  <dl class="grid grid-cols-2 gap-3 sm:grid-cols-4">
    {#each [{ label: 'Home', rec: team.home }, { label: 'Away', rec: team.away }, { label: 'As fav', rec: team.favorite }, { label: 'As dog', rec: team.underdog }] as split (split.label)}
      <div class="rounded-lg bg-background/50 p-3">
        <dt class="text-xs font-medium text-muted-foreground">{split.label}</dt>
        <dd class="text-2xl font-bold tabular-nums">{formatAccuracy(coverPct(split.rec))}</dd>
        <dd class="text-xs text-muted-foreground">{@render wlp(split.rec)}</dd>
      </div>
    {/each}
  </dl>
{/snippet}

<!-- Sortable column header for the team list. Same behaviour as SortableTableHead (arrow icon +
     a next-click aria-label), but a plain button — the list is no longer a <table>, so a <th> is
     out. aria-sort belongs to table/grid roles, so sort state is conveyed by the icon + label. -->
{#snippet sortButton(label: string, key: SortKey, align: 'left' | 'right' = 'left')}
  {@const dir = teamSort.key === key ? teamSort.direction : null}
  <Button
    variant="ghost"
    size="sm"
    class="h-auto px-2 py-1 text-xs font-medium text-muted-foreground {align === 'right'
      ? 'ml-auto -mr-2'
      : '-ml-2'}"
    aria-label={dir === null
      ? `Sort by ${label}`
      : `Sort by ${label} ${dir === 'asc' ? 'descending' : 'ascending'}`}
    title={`Sort by ${label}`}
    onclick={() => setTeamSort(key)}
  >
    {label}
    {#if dir === 'asc'}
      <ArrowUp class="size-3.5" aria-hidden="true" />
    {:else if dir === 'desc'}
      <ArrowDown class="size-3.5" aria-hidden="true" />
    {:else}
      <ArrowUpDown class="size-3.5 text-muted-foreground" aria-hidden="true" />
    {/if}
  </Button>
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

<!-- Teams tab: browse league ATS by team — hot/cold streaks then the sortable team list with
     its per-team game-log drill-down. Rendered as a disclosure list (not a <table>): the
     drill-down is a normal block <div>, so the game-log table inside it can scroll on its own
     `overflow-x-auto` instead of blowing the whole list out horizontally (which a <table> nested
     in a <td> did — an auto-layout cell sizes to content and ignores a child's overflow). Sort
     state lives in `teamSort`, the open row in `expandedTeamId` — both page-level $state, so
     sorting and an open drill-down survive a Trends→Teams round-trip. -->
{#snippet teamsView()}
  <!-- ── Hot & cold streaks ──────────────────────────────────────────────────── -->
  <HotCold streaks={league.streaks} />

  <!-- ── Per-team ATS list ───────────────────────────────────────────────────── -->
  <Card data-testid="league-team-table">
    <CardHeader>
      <CardTitle>Team ATS records</CardTitle>
      <CardDescription>
        Against-the-spread and straight-up records. Open a team for its home/away and
        favorite/underdog splits and full game log.
      </CardDescription>
    </CardHeader>
    <CardContent class="px-2 text-xs sm:px-6 sm:text-sm">
      <div class="{rowGrid} border-b px-2 pb-2">
        {@render sortButton('Team', 'team')}
        {@render sortButton('ATS', 'record')}
        {@render sortButton('Cover %', 'cover', 'right')}
        {@render sortButton('SU', 'su')}
      </div>
      <ul class="divide-y">
        {#each sortedTeams as team (team.teamId)}
          {@const expanded = expandedTeamId === team.teamId}
          <li>
            <button
              type="button"
              class="{rowGrid} w-full rounded px-2 py-2.5 text-left hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-expanded={expanded}
              aria-controls="team-drilldown-{team.teamId}"
              data-testid="league-team-toggle"
              onclick={() => toggleTeam(team.teamId)}
            >
              <span
                class="flex items-center gap-1 font-medium whitespace-nowrap"
                title={team.teamName}
              >
                <ChevronRight
                  class="size-3 shrink-0 transition-transform {expanded ? 'rotate-90' : ''}"
                  aria-hidden="true"
                />
                {team.teamShortName}
              </span>
              <span>{@render wlp(team.ats)}</span>
              <span class="text-right">{formatAccuracy(coverPct(team.ats))}</span>
              <span>{@render wlp(team.su)}</span>
            </button>
            {#if expanded}
              <!-- Normal block panel: the situational tiles paint instantly from the loaded team
                   row; only the game log below waits on the network. -->
              <div
                id="team-drilldown-{team.teamId}"
                data-testid="league-team-drilldown"
                class="mb-2 space-y-4 rounded-lg bg-muted/30 px-3 py-4"
              >
                {@render teamSplits(team)}
                <div>
                  <p class="mb-3 text-sm font-medium">
                    {team.teamName} — {pageData.seasonYear} game log
                  </p>
                  <TeamGameLog
                    teamId={team.teamId}
                    seasonYear={pageData.seasonYear}
                    expectedGames={team.games}
                    {teamNamesById}
                  />
                </div>
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    </CardContent>
  </Card>
{/snippet}

<!-- Favorites vs. underdogs detail panel: the headline cover split as a meter (favorite cover,
     with the 50% baseline standing in for the underdog complement) plus the per-week table in
     season scope. Reads `activeTrends`, so it renders either the picked season or the pooled
     window. -->
{#snippet favoritesPanel()}
  <Card data-testid="league-fav-dog">
    <CardHeader>
      <CardTitle>Favorites vs. underdogs</CardTitle>
      <CardDescription>How often the spread favorite covers, league-wide.</CardDescription>
    </CardHeader>
    <CardContent class="space-y-6">
      <div class="sm:max-w-md">
        <dl class="grid grid-cols-2 gap-4">
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
        <CoverMeter pct={favPct} class="mt-4" />
        <p class="mt-1.5 text-xs text-muted-foreground">
          Bar is the favorite cover rate; the tick marks a 50/50 coin flip.
        </p>
      </div>

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
{/snippet}

<!-- Home vs. away detail panel: one meter row per side (ATS cover), with the straight-up win
     rate kept as a caption. Restructured from the old four-cell grid so the cover rate reads as
     a bar and nothing clips at 390px. -->
{#snippet homeAwayPanel()}
  {#if activeTrends.homeAway}
    {@const ha = activeTrends.homeAway}
    <Card data-testid="league-home-away">
      <CardHeader>
        <CardTitle>Home vs. away</CardTitle>
        <CardDescription>League-wide home and road cover rates.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul class="space-y-4 sm:max-w-md">
          {#each [{ label: 'Home', side: ha.home }, { label: 'Away', side: ha.away }] as row (row.label)}
            <li>
              <div class="flex items-baseline justify-between gap-2 text-sm">
                <span class="font-medium">{row.label}</span>
                <span class="flex items-baseline gap-2">
                  <span class="font-mono tabular-nums"
                    >{formatAccuracy(coverPct(row.side.ats))}</span
                  >
                  <span class="text-xs text-muted-foreground"
                    >ATS · {@render wlp(row.side.ats)}</span
                  >
                </span>
              </div>
              <CoverMeter pct={coverPct(row.side.ats)} class="mt-1.5" />
              <p class="mt-1.5 text-xs text-muted-foreground">
                {formatAccuracy(coverPct(row.side.su))} win rate straight up
              </p>
            </li>
          {/each}
        </ul>
      </CardContent>
    </Card>
  {/if}
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
    <!-- Synthesis first (issue #517): one diverging chart showing which situations bend furthest
         from a coin flip, before the reader drills into any single cut below. -->
    <MarketBends {bends} />

    <!-- One cut at a time: a chip/tab selector rendering a single detail panel, replacing the
         six always-open situational cards. APG tabs pattern (roving tabindex + arrow keys). -->
    {#if availableCuts.length > 0 && activeCut}
      <div class="space-y-4">
        <!-- A radiogroup, not a nested tablist: this control lives inside the page's top-level
             (bits-ui) Teams/Trends Tabs, and a descendant role="tab" would be swept into that
             tablist's roving-focus model and break it. "Pick one cut to view" is a radio choice;
             the detail panel below is the region it drives. -->
        <div
          role="radiogroup"
          aria-label="Situational cut"
          class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        >
          {#each availableCuts as cut (cut)}
            {@const selected = activeCut === cut}
            <button
              type="button"
              role="radio"
              id="league-cut-tab-{cut}"
              aria-checked={selected}
              tabindex={selected ? 0 : -1}
              data-testid="league-cut-chip"
              class="shrink-0 rounded-full border px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {selected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-secondary text-muted-foreground hover:text-foreground'}"
              onclick={() => (selectedCut = cut)}
              onkeydown={onCutKeydown}
            >
              {CUT_LABEL[cut]}
            </button>
          {/each}
        </div>

        <div
          id="league-cut-panel"
          role="region"
          aria-label="{CUT_LABEL[activeCut]} detail"
          data-testid="league-cut-panel"
        >
          {#if activeCut === 'favorites'}
            {@render favoritesPanel()}
          {:else if activeCut === 'spread'}
            <SpreadBuckets buckets={activeTrends.spreadBuckets} />
          {:else if activeCut === 'homeaway'}
            {@render homeAwayPanel()}
          {:else if activeCut === 'quadrants'}
            <Quadrants quadrants={activeTrends.quadrants} />
          {:else if activeCut === 'primetime'}
            <Primetime slots={activeTrends.primetime} />
          {:else if activeCut === 'divisional'}
            <Divisional splits={activeTrends.divisional} />
          {/if}
        </div>
      </div>
    {/if}

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

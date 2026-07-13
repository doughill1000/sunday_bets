<script lang="ts">
  import { goto } from '$app/navigation';
  import { createQuery } from '@tanstack/svelte-query';
  import { queryKeys } from '$lib/query/keys';
  import { fetchLeague, fetchLeagueSlate, fetchLeagueTrends } from '$lib/query/fetchers';
  import type { LeagueCachePayload } from '$lib/query/types';
  import type { LeagueTeamAts, AtsRecord, LeagueFavDogSplit } from '$lib/types/server/league';
  import type { PageData } from './$types';
  import WeekSlate from '$lib/components/league/WeekSlate.svelte';
  import HotCold from '$lib/components/league/HotCold.svelte';
  import TeamGameLog from '$lib/components/league/TeamGameLog.svelte';
  import { Button } from '$lib/components/ui/button';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import ArrowDown from '@lucide/svelte/icons/arrow-down';
  import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
  import SpreadBuckets from '$lib/components/league/SpreadBuckets.svelte';
  import Primetime from '$lib/components/league/Primetime.svelte';
  import Divisional from '$lib/components/league/Divisional.svelte';
  import MarketBends from '$lib/components/league/MarketBends.svelte';
  import CoverMeter from '$lib/components/CoverMeter.svelte';
  import { topMarketBends } from '$lib/utils/leagueBends';
  import {
    availableLeagueSlices,
    resolveLeagueSlice,
    LEAGUE_SLICE_LABEL,
    type LeagueSlice
  } from '$lib/utils/leagueSlices';
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
  // flash-free first paint; on a client-side cache miss the skeleton below shows. One page-level
  // dropdown (#529) drives this season key for the whole page — the by-team roster and that
  // season's situational cuts alike.
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

  // ── Page-level scope (#529) ─────────────────────────────────────────────────────
  // One control drives the whole page: a season (the roster + that season's situational cuts) or
  // the pooled "Last 5" window (the market-structure cuts across the recent seasons, epic #424).
  // Picking a season navigates so `leagueQuery` re-keys (ADR-0017); picking pooled is a pure
  // client flip that enables the season-independent pooled query. Mirrors the Career-in-dropdown
  // scope on /stats (#518): `scope` is set before any `goto`, so it survives the reload as
  // 'season'. This replaces the old split — a Teams-tab picker and a separate Trends-tab toggle
  // that silently disagreed on the window.
  let scope = $state<'season' | 'pooled'>('season');

  // Seasons newest-first for the dropdown; "Last 5 · pooled" is appended as a pinned option.
  const seasonsDesc = $derived([...new Set(pageData.availableSeasons)].sort((a, b) => b - a));

  // The <select> value: a year string in season scope, the sentinel 'pooled' otherwise.
  const scopeValue = $derived(scope === 'pooled' ? 'pooled' : String(pageData.seasonYear));

  const SELECT_CLASS =
    'rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring';

  function onScopeChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    if (value === 'pooled') {
      scope = 'pooled';
      return;
    }
    scope = 'season';
    if (value !== String(pageData.seasonYear)) {
      const url = new URL(window.location.href);
      url.searchParams.set('season', value);
      void goto(url.toString(), { invalidateAll: true, noScroll: true });
    }
  }

  // The pooled payload is season-independent and off until selected, so its query is lazy —
  // `enabled` flips true only in pooled scope, then caches under its own group-independent root
  // (ADR-0017). Needed page-wide (the synthesis lead reads it regardless of the active slice), so
  // it is not gated on any tab.
  const trendsQuery = createQuery(() => ({
    queryKey: queryKeys.leagueTrends(),
    queryFn: () => fetchLeagueTrends(fetch),
    enabled: scope === 'pooled'
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

  // ── Situational-cut source resolution ───────────────────────────────────────────
  // One markup block (the situational detail panels) serves both scopes; this derives the cuts it
  // reads from. The season shape is reused directly; the pooled shape drops the per-week fav/dog
  // table (week 3 of 2022 ≠ week 3 of 2026) by feeding it an empty array. While the pooled query
  // is still loading, `activeTrends` reads EMPTY_TRENDS (not the season fallback), so the always-on
  // synthesis lead never flashes season data under a 'pooled' label.
  const pooled = $derived(trendsQuery.data ?? null);

  const seasonTrends = $derived({
    favDog: league.favDogSeason,
    favDogByWeek: league.favDogByWeek,
    homeAway: league.homeAway,
    spreadBuckets: league.spreadBuckets,
    quadrants: league.quadrants,
    primetime: league.primetime,
    divisional: league.divisional
  });

  const EMPTY_TRENDS = {
    favDog: EMPTY.favDogSeason,
    favDogByWeek: EMPTY.favDogByWeek,
    homeAway: EMPTY.homeAway,
    spreadBuckets: EMPTY.spreadBuckets,
    quadrants: EMPTY.quadrants,
    primetime: EMPTY.primetime,
    divisional: EMPTY.divisional
  };

  const activeTrends = $derived(
    scope === 'pooled'
      ? pooled
        ? {
            favDog: pooled.favDog,
            favDogByWeek: [] as LeagueFavDogSplit[],
            homeAway: pooled.homeAway,
            spreadBuckets: pooled.spreadBuckets,
            quadrants: pooled.quadrants,
            primetime: pooled.primetime,
            divisional: pooled.divisional
          }
        : EMPTY_TRENDS
      : seasonTrends
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

  // ── "Where the market bends" synthesis (issue #517, promoted page-level by #529) ──
  // The ranked favorite-cover deviations that now lead the whole page (not just the old Trends
  // tab), computed off whichever scope is active. The ranking + cover math live in the pure
  // `topMarketBends` transform; empty while a scope loads, so the lead self-hides then.
  const bends = $derived(topMarketBends(activeTrends));

  // ── "Slice by" navigation (issue #529) ──────────────────────────────────────────
  // The Teams|Trends tab bar is gone: "By team" is now just the first way to slice the league,
  // sitting beside the situational cuts in one chip row. Chip availability reads `sliceCuts`,
  // which during a pooled fetch falls back to the (instant, SSR-seeded) season cuts so the row
  // stays stable instead of collapsing to just "By team" for the length of the request — the
  // detail below still reads the honest `activeTrends`. Slice order/labels/availability are the
  // pure `leagueSlices` transform.
  const sliceCuts = $derived(scope === 'pooled' && !pooled ? seasonTrends : activeTrends);
  const availableSlices = $derived(availableLeagueSlices(sliceCuts));

  // The user's chip choice; `activeSlice` falls back to the first slice (always "By team") when
  // the choice is unset or its cut vanished on a scope switch — no reset `$effect` needed.
  let selectedSlice = $state<LeagueSlice | null>(null);
  const activeSlice = $derived(resolveLeagueSlice(selectedSlice, availableSlices));

  // APG roving-tabindex model: arrows/Home/End move selection and focus across the chip row
  // (matching the #517 cut chips). A single-choice view selector, so role="radiogroup".
  function onSliceKeydown(event: KeyboardEvent) {
    const idx = availableSlices.indexOf(activeSlice);
    if (idx === -1) return;
    let next = idx;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (idx + 1) % availableSlices.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (idx - 1 + availableSlices.length) % availableSlices.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = availableSlices.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    selectedSlice = availableSlices[next];
    document.getElementById(`league-slice-tab-${selectedSlice}`)?.focus();
  }

  // Honest chip overflow (#529): the "Slice by" strip scrolls horizontally at 390px, so a
  // right-edge fade appears only while there is un-scrolled content to the right — a visible cue
  // that a cut is hidden, never a silent clip. Re-measured on scroll, on element resize, and when
  // the slice set changes.
  let sliceScroller = $state<HTMLDivElement | null>(null);
  let sliceOverflow = $state(false);
  function measureSliceOverflow() {
    const el = sliceScroller;
    sliceOverflow = el ? el.scrollWidth - el.clientWidth - Math.ceil(el.scrollLeft) > 1 : false;
  }
  $effect(() => {
    const el = sliceScroller;
    if (!el) return;
    void availableSlices; // re-measure when the chip set changes
    measureSliceOverflow();
    const observer = new ResizeObserver(measureSliceOverflow);
    observer.observe(el);
    return () => observer.disconnect();
  });

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

<!-- "By team" slice: browse league ATS by team — hot/cold streaks then the sortable team list
     with its per-team game-log drill-down. Rendered as a disclosure list (not a <table>): the
     drill-down is a normal block <div>, so the game-log table inside it can scroll on its own
     `overflow-x-auto` instead of blowing the whole list out horizontally (which a <table> nested
     in a <td> did — an auto-layout cell sizes to content and ignores a child's overflow). Sort
     state lives in `teamSort`, the open row in `expandedTeamId` — both page-level $state, so
     sorting and an open drill-down survive a slice round-trip. Season-scoped only (the pooled
     window drives the situational cuts, not the roster — #529 non-goal). -->
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

<!-- One situational cut's detail panel, chosen by the active slice. Reads `activeTrends`, so it
     reflects the picked season or the pooled window. The region is labelled by the chip that
     drives it. -->
{#snippet situationalDetail()}
  <div
    id="league-slice-panel"
    role="region"
    aria-labelledby="league-slice-tab-{activeSlice}"
    data-testid="league-slice-panel"
  >
    {#if activeSlice === 'favorites'}
      {@render favoritesPanel()}
    {:else if activeSlice === 'spread'}
      <SpreadBuckets buckets={activeTrends.spreadBuckets} />
    {:else if activeSlice === 'primetime'}
      <Primetime slots={activeTrends.primetime} />
    {:else if activeSlice === 'divisional'}
      <Divisional splits={activeTrends.divisional} />
    {/if}
  </div>
{/snippet}

<svelte:head>
  <title>Teams | Hotshot</title>
</svelte:head>

<section class="mx-auto w-full max-w-screen-xl space-y-6" aria-labelledby="teams-heading">
  <div>
    <h1 id="teams-heading" data-testid="teams-heading" class="text-3xl font-bold tracking-tight">
      Teams
    </h1>
    <p class="mt-1 text-muted-foreground">
      League-wide performance against the spread — the same for everyone.
    </p>
  </div>

  <!-- Forward-looking slate for the current season's upcoming week (issue #429). Its own
       week-sensitive query, so it renders as a hero above the season-scoped modules. -->
  <WeekSlate
    slate={slateQuery.data ?? null}
    loading={slateQuery.isPending}
    error={slateQuery.isError}
  />

  <!-- One page-level season control (#529): the dropdown both the by-team roster and the
       situational cuts obey, replacing the Teams-tab picker and the Trends-tab scope toggle that
       used to disagree. "Last 5 · pooled" is a pinned option (like Career on /stats) that drives
       the situational cuts across the recent seasons. Sticky under the app header (matching the
       /stats scope line) so the season picker never scrolls away as the cuts below get long;
       full-bleed with a blurred bottom border so it reads as an extension of the header. -->
  <div
    data-testid="league-scope-bar"
    class="sticky top-14 z-30 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/75"
  >
    <span
      id="league-scope-label"
      class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Season</span
    >
    <div class="flex flex-wrap items-center justify-end gap-3">
      {#if scope === 'pooled' && pooled && pooled.totalGames > 0}
        <p class="text-xs text-muted-foreground">
          Pooled {pooledRangeLabel} ·
          <span class="font-medium text-foreground">{pooled.totalGames}</span> games
        </p>
      {/if}
      <select
        class={SELECT_CLASS}
        value={scopeValue}
        onchange={onScopeChange}
        aria-labelledby="league-scope-label"
        data-testid="league-scope-select"
      >
        {#each seasonsDesc as year (year)}
          <option value={String(year)}>{year}</option>
        {/each}
        <option value="pooled">Last 5 · pooled</option>
      </select>
    </div>
  </div>

  <!-- Synthesis leads the page (#517, promoted by #529): the diverging one-glance chart of which
       situations bend furthest from a coin flip, for the active scope — no longer trapped inside
       the old Trends tab. Self-hides while a scope loads or has no readable bends. -->
  <MarketBends {bends} />

  <div class="space-y-4">
    <!-- "Slice by" (#529): one chip row replacing the Teams|Trends tab bar. "By team" is the
         default lens; the situational cuts follow (only those with data for the active scope). A
         single-choice view selector (role="radiogroup" + roving tabindex/arrow keys, matching the
         #517 cut chips); the detail region below is what it drives. The strip scrolls at 390px
         with a right-edge fade cue so no cut is silently clipped. -->
    <div class="space-y-2">
      <span
        id="league-slice-label"
        class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Slice by</span
      >
      <div class="relative">
        <div
          bind:this={sliceScroller}
          onscroll={measureSliceOverflow}
          role="radiogroup"
          aria-labelledby="league-slice-label"
          class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        >
          {#each availableSlices as slice (slice)}
            {@const selected = activeSlice === slice}
            <button
              type="button"
              role="radio"
              id="league-slice-tab-{slice}"
              aria-checked={selected}
              tabindex={selected ? 0 : -1}
              data-testid="league-slice-chip"
              class="shrink-0 rounded-full border px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {selected
                ? 'border-primary-ink bg-primary text-primary-foreground'
                : 'border-border bg-secondary text-muted-foreground hover:text-foreground'}"
              onclick={() => (selectedSlice = slice)}
              onkeydown={onSliceKeydown}
            >
              {LEAGUE_SLICE_LABEL[slice]}
            </button>
          {/each}
        </div>
        {#if sliceOverflow}
          <div
            class="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-lg bg-gradient-to-l from-background to-transparent"
            aria-hidden="true"
          ></div>
        {/if}
      </div>
    </div>

    <!-- One detail region for the active slice: the by-team roster or a single situational cut,
         never more than one at a time. Scope-first gating so a pooled fetch shows a skeleton (not
         the by-team nudge) regardless of which chip is active. -->
    {#if scope === 'pooled'}
      {#if trendsQuery.isPending}
        {@render loadingState()}
      {:else if trendsQuery.isError && !trendsQuery.data}
        <!-- Hard failure only (error with no cached data). A failed background refetch that still
             has data keeps rendering the cuts; the shell stale pill flags it (audit S5). -->
        <Card class="border-dashed">
          <CardHeader>
            <CardTitle>Couldn't load pooled trends</CardTitle>
            <CardDescription>Pick a single season above, or retry.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" onclick={() => trendsQuery.refetch()}>Retry</Button>
          </CardContent>
        </Card>
      {:else if !pooled || pooled.totalGames === 0}
        <Card class="border-dashed">
          <CardHeader>
            <CardTitle>No pooled trends yet</CardTitle>
            <CardDescription
              >Multi-season cuts appear once graded seasons are available.</CardDescription
            >
          </CardHeader>
        </Card>
      {:else if activeSlice === 'teams'}
        <!-- Pooled has no per-team roster: a franchise's 5-year ATS blends different rosters and
             regresses to ~50%, so "Last 5" drives the situational cuts, not the team list (#529
             non-goal). Nudge back to a season rather than blanking the slice. -->
        <Card class="border-dashed">
          <CardHeader>
            <CardTitle>Pick a season for team records</CardTitle>
            <CardDescription>
              The pooled “Last 5” window powers the situational cuts (Favorites, Spread, and the
              rest). Team ATS records are season-scoped — choose a season above to browse them.
            </CardDescription>
          </CardHeader>
        </Card>
      {:else}
        {@render situationalDetail()}
        <p class="mt-4 text-xs text-muted-foreground">
          Pooled across the {pooledRangeLabel} seasons to give thin situational cuts enough sample. Even
          pooled, an efficient market keeps most rates within a few points of 50% — read these as descriptive,
          not predictive. Older imported seasons (2022–24) carry a single line snapshot rather than a
          true closing line, so a pooled rate mixes the two.
        </p>
      {/if}
    {:else if leagueQuery.isPending}
      {@render loadingState()}
    {:else if leagueQuery.isError && !leagueQuery.data}
      <Card class="border-dashed">
        <CardHeader>
          <CardTitle>Couldn't load league ATS records</CardTitle>
          <CardDescription>Something went wrong fetching the data.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onclick={() => leagueQuery.refetch()}>Retry</Button>
        </CardContent>
      </Card>
    {:else if league.totalGames === 0}
      <Card class="border-dashed">
        <CardHeader>
          <CardTitle>No graded games for {pageData.seasonYear} yet</CardTitle>
          <CardDescription>
            League ATS records appear once games are graded. Try a different season, or the pooled
            “Last 5” window above.
          </CardDescription>
        </CardHeader>
      </Card>
    {:else if activeSlice === 'teams'}
      <!-- Sample-size caveat: descriptive, not predictive. Older imported seasons (2022–24) have
           missing scores, so their totals are honestly thinner, not misleadingly complete. -->
      <p class="text-sm text-muted-foreground">
        Descriptive records against the closing spread, based on
        <span class="font-medium text-foreground">{league.totalGames}</span>
        scored {league.totalGames === 1 ? 'game' : 'games'} with a line in {pageData.seasonYear}.
        ATS records are noisy — treat small samples with caution.
      </p>
      {@render teamsView()}
    {:else}
      {@render situationalDetail()}
    {/if}
  </div>
</section>

<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query';
  import { queryKeys } from '$lib/query/keys';
  import { fetchLeague, fetchLeagueSlate, fetchLeagueTrends } from '$lib/query/fetchers';
  import type { LeagueCachePayload } from '$lib/query/types';
  import type { LeagueTeamAts, AtsRecord } from '$lib/types/server/league';
  import type { PageData } from './$types';
  import WeekSlate from '$lib/components/league/WeekSlate.svelte';
  import MarketBends from '$lib/components/league/MarketBends.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import ArrowDown from '@lucide/svelte/icons/arrow-down';
  import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
  import { topMarketBends } from '$lib/utils/leagueBends';
  import { formatStreak } from '$lib/utils/leagueStreak';
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
  } from '$lib/components/ui/card';
  import { formatAccuracy } from '$lib/utils/stats';
  import { coverPct } from '$lib/utils/leagueAts';

  let { data: pageData }: { data: PageData } = $props();

  // The lean /market (#692): three fixed cards in pick order — the week slate (what do I
  // pick), the "Where the market bends" synthesis (does any situation actually lean), and the
  // team book (how has this team run). No page-level scope control and no slice explorer —
  // the corrected post-#734/#735 numbers put every situational cut within noise of a coin
  // flip, so the synthesis IS the situational story and the drill-in slices are retired.

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
  // the *current* season's upcoming week (not the season the team book shows) and uses
  // `staleTime: 0` — every load revalidates so it reflects the current line, never a
  // superseded one. It's a distinct, non-persisted query root (ADR-0017).
  const slateQuery = createQuery(() => ({
    queryKey: queryKeys.leagueSlate(pageData.currentSeasonYear),
    queryFn: () => fetchLeagueSlate(fetch, pageData.currentSeasonYear),
    initialData: pageData.initialSlate,
    staleTime: 0
  }));

  // The pooled window backing the bends chart — always on (#692): the multi-season sample is
  // the point of the synthesis, so it is SSR-prefetched like the season payload rather than
  // lazily enabled behind a scope toggle. Season-independent, cached under its own
  // group-independent root (ADR-0017).
  const trendsQuery = createQuery(() => ({
    queryKey: queryKeys.leagueTrends(),
    queryFn: () => fetchLeagueTrends(fetch),
    initialData: pageData.initialTrends
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
  const pooled = $derived(trendsQuery.data ?? null);

  // ── "Where the market bends" (#517, the honest lead of the lean page) ────────────
  // Always the pooled window; empty while it loads, so the card self-hides then.
  const bends = $derived(
    pooled
      ? topMarketBends({
          spreadBuckets: pooled.spreadBuckets,
          quadrants: pooled.quadrants,
          primetime: pooled.primetime,
          divisional: pooled.divisional
        })
      : []
  );

  // The verdict lead: data-derived and phrased neutrally ("the widest bend is…"), so it stays
  // honest whether the market is flat (prod: a few points) or a thin sample swings wide.
  const verdict = $derived.by(() => {
    if (!pooled || bends.length === 0) return null;
    const maxDevPts = Math.max(...bends.map((b) => Math.abs(b.deviation))) * 100;
    const oldest = Math.min(...pooled.seasonsCovered);
    return `Across ${pooled.totalGames} games since ${oldest}, the widest situational bend is ${maxDevPts.toFixed(1)} points off a coin flip.`;
  });

  const footnote = $derived.by(() => {
    if (!pooled || pooled.seasonsCovered.length === 0) return null;
    const min = Math.min(...pooled.seasonsCovered);
    const max = Math.max(...pooled.seasonsCovered);
    const range = min === max ? `${min}` : `${min}–${max}`;
    return `Pooled across the ${range} seasons — descriptive, not predictive. Older imported seasons carry a single line snapshot rather than a true closing line.`;
  });

  // ── Team book caption (#692) — the honest window statement that replaced the dropdown ──
  // In progress: "2026 · through Week 15"; concluded: "2025 · final". Week comes from the
  // per-week fav/dog rows already in the payload (the latest graded week).
  const throughWeek = $derived(
    league.favDogByWeek.length > 0
      ? Math.max(...league.favDogByWeek.map((w) => w.weekNumber ?? 0))
      : null
  );
  const windowLabel = $derived(
    pageData.seasonInProgress && throughWeek != null
      ? `${pageData.seasonYear} · through Week ${throughWeek}`
      : `${pageData.seasonYear} · final`
  );

  // Streak chip per team row (Hot & cold folded into the book, #692). Only active runs get a
  // chip — a push or zero-length run renders nothing, per the view's convention.
  const streakByTeam = $derived(
    new Map(
      league.streaks
        .filter((s) => s.streakLength > 0 && s.streakResult !== 'push')
        .map((s) => [s.teamId, s] as const)
    )
  );

  // Team drill-down: one expanded row at a time (accordion) showing the four in-memory
  // situational split tiles. The per-game log (its own endpoint + lazy fetch) is retired.
  let expandedTeamId = $state<number | null>(null);
  function toggleTeam(teamId: number) {
    expandedTeamId = expandedTeamId === teamId ? null : teamId;
  }

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

<!-- Situational ATS splits for a team's drill-down: home/away and favorite/underdog — the same
     quadrants the slate's nugget quotes. Sourced from the in-memory team row, so it paints with
     no fetch. Cover % is "--" for a decision-less split (e.g. a lone push), by design. -->
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
      ? '-mr-2 ml-auto'
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
  </div>
{/snippet}

<svelte:head>
  <title>Market | Hotshot</title>
</svelte:head>

<section class="mx-auto w-full max-w-screen-xl space-y-6" aria-labelledby="market-heading">
  <div>
    <h1 id="market-heading" data-testid="market-heading" class="text-3xl font-bold tracking-tight">
      Market
    </h1>
    <p class="mt-1 text-muted-foreground">
      How the NFL market moves against the spread — the same for everyone.
    </p>
  </div>

  <!-- 1 · The pre-pick companion: the current week's upcoming games with each side's
       situational nugget, deep-linking into /picks (issue #429). -->
  <WeekSlate
    slate={slateQuery.data ?? null}
    loading={slateQuery.isPending}
    error={slateQuery.isError}
  />

  <!-- 2 · The honest lead (#517/#692): the pooled diverging chart with its data-derived
       verdict. Self-hides while the pooled window loads or has no readable bends. -->
  <MarketBends {bends} {verdict} {footnote} />

  <!-- 3 · The team book: sortable season roster with streak chips (Hot & cold folded in) and
       the one-level splits drill-down. The caption states the window — no dropdown. -->
  {#if leagueQuery.isPending}
    {@render loadingState()}
  {:else if leagueQuery.isError && !leagueQuery.data}
    <Card class="border-dashed">
      <CardHeader>
        <CardTitle>Couldn't load market records</CardTitle>
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
          Team ATS records appear once games are graded. Check back after the first scored week.
        </CardDescription>
      </CardHeader>
    </Card>
  {:else}
    <Card data-testid="league-team-table">
      <CardHeader>
        <CardTitle>Team ATS records</CardTitle>
        <CardDescription>
          {windowLabel} · descriptive records against the closing spread, based on
          <span class="font-medium text-foreground">{league.totalGames}</span>
          scored {league.totalGames === 1 ? 'game' : 'games'} with a line. Open a team for its home/away
          and favorite/underdog splits. ATS records are noisy — treat small samples with caution.
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
            {@const streak = streakByTeam.get(team.teamId)}
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
                  class="flex items-center gap-1.5 font-medium whitespace-nowrap"
                  title={team.teamName}
                >
                  <ChevronRight
                    class="size-3 shrink-0 transition-transform {expanded ? 'rotate-90' : ''}"
                    aria-hidden="true"
                  />
                  {team.teamShortName}
                  {#if streak}
                    <!-- Active ATS run (Hot & cold folded into the book, #692). Semantic
                         success/destructive tones — status, not the accent. -->
                    <Badge
                      variant={streak.streakResult === 'win' ? 'success' : 'destructive'}
                      class="px-1 py-0 text-[10px] tabular-nums"
                    >
                      {formatStreak(streak)}
                    </Badge>
                  {/if}
                </span>
                <span>{@render wlp(team.ats)}</span>
                <span class="text-right">{formatAccuracy(coverPct(team.ats))}</span>
                <span>{@render wlp(team.su)}</span>
              </button>
              {#if expanded}
                <!-- The four situational tiles paint instantly from the loaded team row; the
                     per-game log drill-down was retired with the explorer (#692). -->
                <div
                  id="team-drilldown-{team.teamId}"
                  data-testid="league-team-drilldown"
                  class="mb-2 rounded-lg bg-muted/30 px-3 py-4"
                >
                  {@render teamSplits(team)}
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      </CardContent>
    </Card>
  {/if}
</section>

<script lang="ts">
  // Demo Market (#460, ADR-0026 — extended #669): the real Market surfaces — MarketBends,
  // the "Slice by" situational cuts, hot/cold streaks, and the sortable team ATS list with its
  // in-memory home/away/fav/dog splits — reading the frozen `market` payload directly. No
  // `WeekSlate` (forward-looking, nothing to freeze) and no per-team game-log drill-down (its own
  // live fetch) — see the server load's comment. Single season, no pooled "Last 5" toggle: the
  // snapshot carries exactly one season (the live one, #669's stated default).
  import type { PageData } from './$types';
  import type { LeagueTeamAts, AtsRecord } from '$lib/types/server/league';
  import HotCold from '$lib/components/league/HotCold.svelte';
  import { Button } from '$lib/components/ui/button';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import ArrowDown from '@lucide/svelte/icons/arrow-down';
  import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
  import SpreadBuckets from '$lib/components/league/SpreadBuckets.svelte';
  import Primetime from '$lib/components/league/Primetime.svelte';
  import Divisional from '$lib/components/league/Divisional.svelte';
  import MarketBends from '$lib/components/league/MarketBends.svelte';
  import ChipRadiogroup from '$lib/components/stats/ChipRadiogroup.svelte';
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

  let { data }: { data: PageData } = $props();
  const league = $derived(data.market);

  const trends = $derived({
    favDog: league.favDogSeason,
    favDogByWeek: league.favDogByWeek,
    homeAway: league.homeAway,
    spreadBuckets: league.spreadBuckets,
    quadrants: league.quadrants,
    primetime: league.primetime,
    divisional: league.divisional
  });

  const favPct = $derived(
    coverPct({ wins: trends.favDog.favoriteCovers, losses: trends.favDog.underdogCovers })
  );
  const dogPct = $derived(
    coverPct({ wins: trends.favDog.underdogCovers, losses: trends.favDog.favoriteCovers })
  );

  const bends = $derived(topMarketBends(trends));

  const availableSlices = $derived(availableLeagueSlices(trends));
  let selectedSlice = $state<LeagueSlice | null>(null);
  const activeSlice = $derived(resolveLeagueSlice(selectedSlice, availableSlices));
  const sliceOptions = $derived(
    availableSlices.map((slice) => ({ value: slice, label: LEAGUE_SLICE_LABEL[slice] }))
  );

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
    if (a == null) return 1;
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

  let expandedTeamId = $state<number | null>(null);
  function toggleTeam(teamId: number) {
    expandedTeamId = expandedTeamId === teamId ? null : teamId;
  }

  const rowGrid = 'grid grid-cols-[minmax(0,1fr)_4.5rem_3.25rem_4.5rem] items-center gap-x-2';
</script>

{#snippet wlp(rec: AtsRecord)}
  <span class="tabular-nums">{rec.wins}-{rec.losses}-{rec.pushes}</span>
{/snippet}

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

{#snippet teamsView()}
  <HotCold streaks={league.streaks} />

  <Card data-testid="demo-market-team-table">
    <CardHeader>
      <CardTitle>Team ATS records</CardTitle>
      <CardDescription>
        Against-the-spread and straight-up records. Open a team for its home/away and
        favorite/underdog splits.
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
              aria-controls="demo-team-drilldown-{team.teamId}"
              data-testid="demo-market-team-toggle"
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
              <div
                id="demo-team-drilldown-{team.teamId}"
                data-testid="demo-market-team-drilldown"
                class="mb-2 space-y-4 rounded-lg bg-muted/30 px-3 py-4"
              >
                {@render teamSplits(team)}
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    </CardContent>
  </Card>
{/snippet}

{#snippet favoritesPanel()}
  <Card data-testid="league-fav-dog">
    <CardHeader>
      <CardTitle>Favorites vs. underdogs</CardTitle>
      <CardDescription>How often the spread favorite covers, NFL-wide.</CardDescription>
    </CardHeader>
    <CardContent class="space-y-6">
      <div class="sm:max-w-md">
        <dl class="grid grid-cols-2 gap-4">
          <div>
            <dt class="text-xs font-medium text-muted-foreground">Favorites cover</dt>
            <dd class="text-3xl font-bold">{formatAccuracy(favPct)}</dd>
            <p class="text-xs text-muted-foreground">{trends.favDog.favoriteCovers} covers</p>
          </div>
          <div>
            <dt class="text-xs font-medium text-muted-foreground">Underdogs cover</dt>
            <dd class="text-3xl font-bold">{formatAccuracy(dogPct)}</dd>
            <p class="text-xs text-muted-foreground">{trends.favDog.underdogCovers} covers</p>
          </div>
        </dl>
        <CoverMeter pct={favPct} class="mt-4" />
        <p class="mt-1.5 text-xs text-muted-foreground">
          Bar is the favorite cover rate; the tick marks a 50/50 coin flip.
        </p>
      </div>

      {#if trends.favDogByWeek.length > 0}
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
              {#each trends.favDogByWeek as wk (wk.weekNumber)}
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

{#snippet situationalDetail()}
  <div
    id="demo-league-slice-panel"
    role="region"
    aria-labelledby="demo-league-slice-tab-{activeSlice}"
    data-testid="demo-league-slice-panel"
  >
    {#if activeSlice === 'favorites'}
      {@render favoritesPanel()}
    {:else if activeSlice === 'spread'}
      <SpreadBuckets buckets={trends.spreadBuckets} />
    {:else if activeSlice === 'primetime'}
      <Primetime slots={trends.primetime} />
    {:else if activeSlice === 'divisional'}
      <Divisional splits={trends.divisional} />
    {/if}
  </div>
{/snippet}

<svelte:head>
  <title>Market | Hotshot Demo</title>
</svelte:head>

<section class="mx-auto w-full max-w-screen-xl space-y-6" aria-labelledby="demo-market-heading">
  <div>
    <h1
      id="demo-market-heading"
      data-testid="market-heading"
      class="text-3xl font-bold tracking-tight"
    >
      Market
    </h1>
    <p class="mt-1 text-muted-foreground">
      How the NFL market moves against the spread — the same for everyone.
    </p>
  </div>

  <MarketBends {bends} />

  <div class="space-y-4">
    <div class="space-y-2">
      <span class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Slice by</span
      >
      <ChipRadiogroup
        options={sliceOptions}
        value={activeSlice}
        ariaLabel="Slice by"
        idPrefix="demo-league-slice-tab"
        testid="demo-league-slice-chip"
        onchange={(value) => (selectedSlice = value as LeagueSlice)}
      />
    </div>

    {#if league.totalGames === 0}
      <Card class="border-dashed">
        <CardHeader>
          <CardTitle>No graded games for {data.seasonYear} yet</CardTitle>
        </CardHeader>
      </Card>
    {:else if activeSlice === 'teams'}
      <p class="text-sm text-muted-foreground">
        Descriptive records against the closing spread, based on
        <span class="font-medium text-foreground">{league.totalGames}</span>
        scored {league.totalGames === 1 ? 'game' : 'games'} in {data.seasonYear}.
      </p>
      {@render teamsView()}
    {:else}
      {@render situationalDetail()}
    {/if}
  </div>
</section>

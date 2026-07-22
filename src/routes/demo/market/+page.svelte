<script lang="ts">
  // Demo Market (#460, ADR-0026 — lean form #692): the same three-part story as the real
  // /market minus the live-only surfaces — MarketBends with its verdict lead, then the team
  // book with streak chips and the in-memory home/away/fav/dog splits drill-down. No
  // `WeekSlate` (forward-looking, nothing to freeze — see the server load's comment). The
  // frozen snapshot carries exactly one season, so the bends read that season's cuts and the
  // verdict names it (the real page pools the recent seasons).
  import type { PageData } from './$types';
  import type { LeagueTeamAts, AtsRecord } from '$lib/types/server/league';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import ArrowDown from '@lucide/svelte/icons/arrow-down';
  import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
  import MarketBends from '$lib/components/league/MarketBends.svelte';
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

  let { data }: { data: PageData } = $props();
  const league = $derived(data.market);

  const bends = $derived(
    topMarketBends({
      spreadBuckets: league.spreadBuckets,
      quadrants: league.quadrants,
      primetime: league.primetime,
      divisional: league.divisional
    })
  );

  // Same data-derived verdict shape as the real page (#692), over the snapshot's one season.
  const verdict = $derived.by(() => {
    if (bends.length === 0) return null;
    const maxDevPts = Math.max(...bends.map((b) => Math.abs(b.deviation))) * 100;
    return `Across ${league.totalGames} games in ${data.seasonYear}, the widest situational bend is ${maxDevPts.toFixed(1)} points off a coin flip.`;
  });

  // Streak chip per team row (Hot & cold folded into the book, #692).
  const streakByTeam = $derived(
    new Map(
      league.streaks
        .filter((s) => s.streakLength > 0 && s.streakResult !== 'push')
        .map((s) => [s.teamId, s] as const)
    )
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

  <MarketBends {bends} {verdict} />

  {#if league.totalGames === 0}
    <Card class="border-dashed">
      <CardHeader>
        <CardTitle>No graded games for {data.seasonYear} yet</CardTitle>
      </CardHeader>
    </Card>
  {:else}
    <Card data-testid="demo-market-team-table">
      <CardHeader>
        <CardTitle>Team ATS records</CardTitle>
        <CardDescription>
          {data.seasonYear} · descriptive records against the closing spread, based on
          <span class="font-medium text-foreground">{league.totalGames}</span>
          scored {league.totalGames === 1 ? 'game' : 'games'} with a line. Open a team for its home/away
          and favorite/underdog splits.
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
                aria-controls="demo-team-drilldown-{team.teamId}"
                data-testid="demo-market-team-toggle"
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
                <div
                  id="demo-team-drilldown-{team.teamId}"
                  data-testid="demo-market-team-drilldown"
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

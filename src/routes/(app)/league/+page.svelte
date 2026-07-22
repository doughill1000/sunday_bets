<script lang="ts">
  import { goto, replaceState } from '$app/navigation';
  import { createQuery } from '@tanstack/svelte-query';
  import { queryKeys } from '$lib/query/keys';
  import {
    fetchLeaderboard,
    fetchAllTimeLeaderboard,
    fetchGroup,
    fetchRecap
  } from '$lib/query/fetchers';
  import type {
    LeaderboardCachePayload,
    AllTimeLeaderboardPayload,
    GroupCachePayload,
    RecapCachePayload
  } from '$lib/query/types';
  import type { PageData } from './$types';
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
  } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
  import WeeklyPicksBreakdown from '$lib/components/leaderboard/WeeklyPicksBreakdown.svelte';
  import WeekNavigator from '$lib/components/leaderboard/WeekNavigator.svelte';
  import SeasonRaceChart from '$lib/components/leaderboard/SeasonRaceChart.svelte';
  import StandingsTable from '$lib/components/leaderboard/StandingsTable.svelte';
  import WeeklyHardware from '$lib/components/recap/WeeklyHardware.svelte';
  import LeagueHonors from '$lib/components/group/LeagueHonors.svelte';
  import ReigningChampionBanner from '$lib/components/group/ReigningChampionBanner.svelte';
  import RatingLadder from '$lib/components/leaderboard/RatingLadder.svelte';
  import { hasRatedMember } from '$lib/domain/rating';
  import { seasonScopeOptions } from '$lib/utils/stats';
  import { weekLabel } from '$lib/utils/weekLabel';
  import { hasGradedWeek, rankMovements } from '$lib/utils/leaderboardTrend';
  import { ACTIVE_TAB_TRIGGER_CLASS } from '$lib/ui/tabs';
  import Users from '@lucide/svelte/icons/users';

  let { data: pageData }: { data: PageData } = $props();

  // Two page-level views (principle 2): Standings and Week are Tabs, and each tab owns exactly
  // one context control rendered inside its own panel (#631) — Standings the season/All-time
  // window, Week the week picker. The time window folds a pinned "All-time" option into the
  // season dropdown (#518/#529) rather than being a third tab. `scope` is a pure client flip;
  // changing the *season* navigates so the season-scoped query re-keys (ADR-0017).
  let activeTab = $state<'standings' | 'weekly'>(pageData.view);
  // Initial scope comes from `pageData.defaultScope` (#737): 'season' always — offseason
  // included, where the default season is the last graded one and its honors lead the page —
  // unless the visitor explicitly asked for the career window via `?scope=alltime`, which is
  // what makes the All-time view a shareable URL rather than an unaddressable client flip.
  let scope = $state<'season' | 'alltime'>(pageData.defaultScope);

  // Shareable season standings come from a cached `createQuery` keyed by `(groupId, season)`:
  // a revisit renders the last value instantly and revalidates in the background (ADR-0017).
  // `pageData.initialLeaderboard` is the server-prefetched value (present on the initial/SSR
  // request) used as `initialData` so first paint has no flash; on a client-side cache miss
  // the query loads and the skeleton below shows. The Week view's user-specific breakdown
  // stays on `pageData` (server load). They merge below, `pageData` last.
  const leaderboardQuery = createQuery(() => ({
    queryKey: queryKeys.leaderboard(pageData.groupId, pageData.seasonYear, 'standings', null, null),
    queryFn: () => fetchLeaderboard(fetch, pageData.groupId, pageData.seasonYear),
    initialData: pageData.initialLeaderboard
  }));

  // All-time (career) totals (#376) — season-independent, so the query key uses a fixed
  // season/week slot (`0`, `null`) rather than `pageData.seasonYear`; it stays cached across
  // season switches. Always loaded (not gated on the active scope) so switching to the
  // All-time window is an instant, flash-free flip, mirroring Career on /stats (#518).
  const allTimeQuery = createQuery(() => ({
    queryKey: queryKeys.leaderboard(pageData.groupId, 0, 'alltime', null, null),
    queryFn: () => fetchAllTimeLeaderboard(fetch, pageData.groupId),
    initialData: pageData.initialAllTime
  }));

  // The honors case (#561: champion, trophy case, wooden spoon, and awards) moved here from the
  // old Group tab. It reads the shareable group payload from a `createQuery` keyed by
  // `(groupId, season)` — the SAME key /league/manage uses, so both share one cache entry
  // (ADR-0017). Only the shareable honors/badges/members are read here; the sensitive
  // commissioner/invite data stays on /league/manage's server load and is never cached.
  const groupQuery = createQuery(() => ({
    queryKey: queryKeys.group(pageData.groupId, pageData.seasonYear),
    queryFn: () => fetchGroup(fetch, pageData.groupId, pageData.seasonYear),
    initialData: pageData.initialGroup
  }));

  // The Week tab leads with the selected week's hardware (#631). Rather than adding a payload to
  // the server load, it reuses the SAME cached recap query `/recap` already owns — one
  // `['recap', groupId, season]` entry serves both surfaces (ADR-0033, #602), so the Week tab and
  // the Season recaps archive can never disagree about a week's awards. Gated on the Week tab so
  // a Standings visitor never pays for it; `+page.ts` prefetches it only on a `?view=weekly`
  // request, which is the only way Week is ever server-rendered.
  const recapQuery = createQuery(() => ({
    queryKey: queryKeys.recap(pageData.groupId, pageData.seasonYear),
    queryFn: () => fetchRecap(fetch, pageData.groupId, pageData.seasonYear),
    initialData: pageData.initialRecap,
    enabled: activeTab === 'weekly'
  }));

  // Empty shapes so the render stays valid while a query loads on a cache miss (the pending
  // branches gate real render; honors self-hides on the empty shape).
  const EMPTY_LEADERBOARD: LeaderboardCachePayload = {
    seasonYear: 0,
    totals: [],
    totalsCursor: null,
    championUserId: null,
    dropActive: false
  };

  const EMPTY_ALLTIME: AllTimeLeaderboardPayload = {
    totals: [],
    dropActive: false,
    ladder: []
  };

  const EMPTY_GROUP: GroupCachePayload = {
    group: { id: '', name: '' },
    members: [],
    membersCursor: null,
    honors: { reigningChampion: null, trophyCase: [], woodenSpoon: null },
    badges: []
  };

  const EMPTY_RECAP: RecapCachePayload = {
    recaps: [],
    weeklyAwards: { season_year: 0, weeks: [], shelf: [] }
  };

  const data = $derived({ ...(leaderboardQuery.data ?? EMPTY_LEADERBOARD), ...pageData });
  const allTime = $derived(allTimeQuery.data ?? EMPTY_ALLTIME);
  const group = $derived(groupQuery.data ?? EMPTY_GROUP);
  const recap = $derived(recapQuery.data ?? EMPTY_RECAP);

  // `data.championUserId` would resolve to the layout's streamed champion Promise (added in
  // #339); the reigning champion for the standings crown comes from the cached standings
  // payload instead, which carries it synchronously.
  const championUserId = $derived((leaderboardQuery.data ?? EMPTY_LEADERBOARD).championUserId);

  // Who runs the league (#660) — the Commissioner chip on each standings row. `role` is already
  // in the shareable cached group payload, so this exposes nothing new and needs no plumbing
  // (ADR-0017 boundary 3 holds). It's a label for everyone, NOT an authorization signal: the
  // Manage entry gates on `data.isCommissioner` from the uncached server load.
  //
  // `group.members` paginates (`membersCursor`), so a commissioner past the first page wouldn't
  // be in this set and simply renders unchipped — leagues are far below the page size today,
  // and marking only what's loaded beats a second fetch to complete a cosmetic label.
  const commissionerIds = $derived(
    new Set(group.members.filter((m) => m.role === 'commissioner').map((m) => m.userId))
  );

  // Standings rank movement vs the previous graded week (#561), derived from the season trend on
  // the server load. Positive = climbed. Season-scoped only; the All-time table passes `null`.
  const movements = $derived(rankMovements(pageData.trend ?? []));

  // The selected week's hardware, plus the prose recap for that same week if one was generated.
  // Hardware only exists for FULLY-graded scoring weeks, so both are null on an in-progress week
  // and on every preseason round (ADR-0016 non-scoring rounds never mint awards).
  const selectedHardware = $derived(
    pageData.selectedWeek != null
      ? (recap.weeklyAwards.weeks.find(
          (w) => w.week_number === pageData.selectedWeek?.weekNumber
        ) ?? null)
      : null
  );
  const selectedWeekRecap = $derived(
    pageData.selectedWeek != null
      ? (recap.recaps.find((r) => r.week_number === pageData.selectedWeek?.weekNumber) ?? null)
      : null
  );

  // Fold the currently-displayed season into the option set so the dropdown can always
  // represent `scopeValue`. `resolveSeasonYear` can land on a season that has no standings
  // yet — a brand-new/pre-grading season (empty `availableSeasons` → the active season year),
  // or an out-of-range `?season=` — and `availableSeasons` is derived from graded standings
  // only (`group_season_years`), so that season is absent from it. Without this the <select>
  // value would match no <option>, silently blanking the control to `''` while the subtitle
  // still reads "<year> season." (this empty value is what tripped the all-time e2e spec).
  // `currentSeasonYear` is folded in too (#737) so the week-1 window offers a "This season"
  // pin for the seeded-but-ungraded year while the default stays the last graded season —
  // the server computes `latestSeasonInProgress` against the same folded maximum.
  const scopeOptions = $derived(
    seasonScopeOptions(
      [...data.availableSeasons, data.seasonYear, data.currentSeasonYear],
      data.latestSeasonInProgress
    )
  );
  const scopeValue = $derived(scope === 'alltime' ? 'alltime' : String(data.seasonYear));

  // The ladder's ▲/▼ arrow narrates how much the LATEST settled season moved each career
  // rating (`computeRatings.ts`) — it is not parameterized by the viewed season. Now that the
  // ladder renders under every scope (#737), suppress it when browsing an older season so a
  // "this season" delta never sits beside a 2023 table (ADR-0032 §9 non-conflation).
  const latestDataSeason = $derived(Math.max(...data.availableSeasons, data.seasonYear));
  const showLadderSeasonDelta = $derived(
    scope === 'alltime' || data.seasonYear === latestDataSeason
  );

  // The subtitle names whatever the ACTIVE tab's own control is set to, so the two tabs never
  // both claim the header line.
  const subtitle = $derived.by(() => {
    if (activeTab === 'weekly') {
      return `${data.seasonYear} season · ${weekLabel(data.selectedWeek)}.`;
    }
    return scope === 'alltime' ? 'All-time · every season combined.' : `${data.seasonYear} season.`;
  });

  const SELECT_CLASS =
    'rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';

  // Full-bleed sticky context bar, shared by both tabs so one-control-per-tab reads as one
  // pattern. Sticks under the app header (h-14) as the panel below it gets long.
  const SCOPE_BAR_CLASS =
    'sticky top-14 z-30 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/75';

  function onScopeChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value;
    const url = new URL(window.location.href);
    if (value === 'alltime') {
      // All-time is a standings window, and this control now lives inside the Standings panel —
      // so it can only ever be reached from Standings. The flip is pure client state (no data
      // to load — the career query is always warm), but the URL mirrors it via `?scope=alltime`
      // (#737) so the view is shareable and survives a reload; `replaceState` keeps the flip
      // out of the back-button history the way a view toggle should be.
      scope = 'alltime';
      url.searchParams.set('scope', 'alltime');
      replaceState(url, {});
      return;
    }
    scope = 'season';
    url.searchParams.delete('scope');
    if (value !== String(data.seasonYear)) {
      url.searchParams.set('season', value);
      void goto(url.toString(), { invalidateAll: true, noScroll: true });
    } else {
      replaceState(url, {});
    }
  }

  // When the user clicks the Week tab and we haven't loaded weekly data yet, trigger a navigation.
  let weeklyNavigated = $state(pageData.view === 'weekly');

  $effect(() => {
    if (activeTab === 'weekly') {
      if (!weeklyNavigated) {
        weeklyNavigated = true;
        const url = new URL(window.location.href);
        url.searchParams.set('view', 'weekly');
        void goto(url.toString(), { noScroll: true, keepFocus: true });
      }
    } else {
      weeklyNavigated = false;
    }
  });
</script>

<svelte:head>
  <title>League | Hotshot</title>
</svelte:head>

{#snippet standingsLoading()}
  <!-- Cache miss (no SSR initialData, nothing cached yet): skeleton while the query loads. -->
  <Card>
    <CardContent class="space-y-3 p-6" aria-hidden="true">
      {#each [0, 1, 2, 3, 4, 5] as i (i)}
        <div class="h-8 w-full animate-pulse rounded bg-muted"></div>
      {/each}
    </CardContent>
  </Card>
{/snippet}

{#snippet honorsCard()}
  <!-- Honors (#561): trophy case, wooden spoon, and awards — the reigning champion itself
       lives in the evergreen banner above the tabs (#727). Keyed on the page's resolved
       season (shared cache with /league/manage), following the scope selector rather than
       carrying a second picker (#631). A snippet because its position depends on the viewed
       season's state (#737): a concluded season leads with it, an in-progress one shows the
       table first. Also the durable door to Season Wrapped since #737 retired WrappedPromo. -->
  <LeagueHonors
    honors={group.honors}
    badges={group.badges}
    members={group.members}
    currentUserId={data.currentUserId}
    selectedSeason={data.seasonYear}
    recapsHref={`/recap?season=${data.seasonYear}`}
  />
{/snippet}

{#snippet standingsError(retry: () => void)}
  <!-- Only shown on a *hard* failure (error with no cached data); a background-refetch failure
       that still has last-good data keeps rendering the table, and the shell stale pill flags it
       (audit S5). Retry refetches this query rather than telling the user to reload the page. -->
  <Card class="border-dashed">
    <CardHeader>
      <CardTitle>Couldn't load standings</CardTitle>
      <CardDescription>Something went wrong fetching the standings.</CardDescription>
    </CardHeader>
    <CardContent>
      <Button variant="outline" size="sm" onclick={retry}>Retry</Button>
    </CardContent>
  </Card>
{/snippet}

<!-- The League home (#561, re-contained by #631): two self-contained tabs where the tab you're on
     fully governs what's on screen. Only the heading, the Manage action, and the champion banner
     render outside the tab group — honors and the manage card used to sit after `</Tabs>` and
     so appeared identically under both tabs. The standings testids keep their `leaderboard-`
     prefix as stable e2e anchors (see tests/e2e/helpers/leaderboard-page.ts): the content is still
     the leaderboard, and those anchors stay put across renames. -->
<section class="mx-auto w-full max-w-screen-xl space-y-6" aria-labelledby="leaderboard-heading">
  <div class="flex items-start justify-between gap-3">
    <div class="min-w-0">
      <h1
        id="leaderboard-heading"
        data-testid="leaderboard-heading"
        class="text-3xl font-bold tracking-tight"
      >
        League
      </h1>
      <p class="mt-1 text-muted-foreground" data-testid="leaderboard-subtitle">
        {subtitle}
      </p>
    </div>

    <!-- Manage (#631): a heading action rather than the full-width card that used to render
         after `</Tabs>` under every tab. It stays on the page rather than in the global
         AppHeader — that header is shared by /picks, /stats and /market and has no room left at
         390px, while the console is a League-only destination.
         #660: commissioners only. The page behind it is now their console — a member who
         followed it saw a roster and two personal toggles that have since moved to /settings,
         so for them it led nowhere. -->
    {#if data.isCommissioner}
      <Button
        href="/league/manage"
        data-testid="manage-entry"
        variant="outline"
        size="sm"
        class="shrink-0"
      >
        <Users class="size-4" aria-hidden="true" />
        Manage
      </Button>
    {/if}
  </div>

  <!-- Reigning-champion banner (#727): evergreen, rendered above the tab group so it shows on
       both Standings and Week — unlike the old LeagueHonors placement, which only reached the
       Standings-season branch. WrappedPromo used to stack above it; #737 retired the promo
       (its CTA lives in the honors card's Wrapped link), so the banner is the one block that
       renders outside the tab group and the dense tab nets lighter. -->
  {#if group.honors.reigningChampion}
    <ReigningChampionBanner
      reigningChampion={group.honors.reigningChampion}
      currentUserId={data.currentUserId}
    />
  {/if}

  <Tabs bind:value={activeTab} class="w-full space-y-4">
    <TabsList class="grid w-full grid-cols-2 sm:inline-grid sm:w-auto">
      <TabsTrigger
        value="standings"
        data-testid="leaderboard-tab-standings"
        class={ACTIVE_TAB_TRIGGER_CLASS}>Standings</TabsTrigger
      >
      <!-- Labelled "Week" (#631) — it shows one selected week, not a trend. The testid and the
           `?view=weekly` param keep their old spelling on purpose: the testid is a stable e2e
           anchor, and the param is a shareable-URL contract. -->
      <TabsTrigger
        value="weekly"
        data-testid="leaderboard-tab-weekly"
        class={ACTIVE_TAB_TRIGGER_CLASS}>Week</TabsTrigger
      >
    </TabsList>

    <TabsContent value="standings" data-testid="standings-panel">
      <!-- Standings' one control: seasons plus a pinned "All-time" option (#518/#529). Now inside
           the panel, so All-time is only offered by the tab that actually has an All-time view. -->
      <div data-testid="leaderboard-scope-bar" class={SCOPE_BAR_CLASS}>
        <span
          id="leaderboard-scope-label"
          class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Season</span
        >
        <select
          class={SELECT_CLASS}
          value={scopeValue}
          onchange={onScopeChange}
          aria-labelledby="leaderboard-scope-label"
          data-testid="leaderboard-scope"
        >
          <!-- Exactly one season pin (#638/#737): "This season" while one is in progress,
               "Last season" once it has concluded — a concluded season is never labelled
               "This season", and the pinned year is deduped out of Past seasons. -->
          {#if scopeOptions.latest !== null}
            <option value={String(scopeOptions.latest)}>This season · {scopeOptions.latest}</option>
          {:else if scopeOptions.lastCompleted !== null}
            <option value={String(scopeOptions.lastCompleted)}>
              Last season · {scopeOptions.lastCompleted}
            </option>
          {/if}
          <option value="alltime">All-time</option>
          {#if scopeOptions.pastSeasons.length > 0}
            <optgroup label="Past seasons">
              {#each scopeOptions.pastSeasons as year (year)}
                <option value={String(year)}>{year}</option>
              {/each}
            </optgroup>
          {/if}
        </select>
      </div>

      <!-- Block order (#737) is data-keyed, never calendar-keyed — the same season's page
           renders identically in July and November. A concluded season leads with its crown
           (honors → table); an in-progress one with the live question (table → honors). The
           ladder and the race follow beneath in every case. -->
      <div class="mt-4 space-y-6">
        {#if scope === 'alltime'}
          {#if allTimeQuery.isPending}
            {@render standingsLoading()}
          {:else if allTimeQuery.isError && !allTimeQuery.data}
            {@render standingsError(() => allTimeQuery.refetch())}
          {:else if allTime.totals.length === 0}
            <Card class="border-dashed" data-testid="alltime-empty">
              <CardHeader>
                <CardTitle>No all-time standings yet</CardTitle>
                <CardDescription>
                  All-time totals will appear once a season has been graded.
                </CardDescription>
              </CardHeader>
            </Card>
          {:else}
            <StandingsTable
              rows={allTime.totals}
              title="All-time standings"
              currentUserId={data.currentUserId}
              showDropFootnote={allTime.dropActive}
              dropCopy="Total drops each player's lowest week per season. W-L-P count every week."
              tableTestid="alltime-table"
              {commissionerIds}
            />
          {/if}
        {:else}
          <!-- The season window. Honors is season-scoped, so it renders here and not under
               All-time: an "Awards · 2025 · Crowned" block beside a career table would be
               exactly the two-things-disagreeing-about-the-season problem #631 set out to fix.
               It sits outside the standings branch chain so a league with a champion but a
               pre-grading current season still shows its trophy case. -->
          {#if !data.viewedSeasonInProgress}
            {@render honorsCard()}
          {/if}
          {#if leaderboardQuery.isPending}
            {@render standingsLoading()}
          {:else if leaderboardQuery.isError && !leaderboardQuery.data}
            {@render standingsError(() => leaderboardQuery.refetch())}
          {:else if data.totals.length === 0}
            <Card class="border-dashed" data-testid="standings-empty">
              <CardHeader>
                <CardTitle>No standings yet</CardTitle>
                <CardDescription>
                  Season standings will appear after the first games are graded.
                </CardDescription>
              </CardHeader>
            </Card>
          {:else}
            <StandingsTable
              rows={data.totals}
              title="{data.seasonYear} standings"
              currentUserId={data.currentUserId}
              showDropFootnote={data.dropActive}
              dropCopy="Total drops each player's lowest week. W-L-P count every week."
              tableTestid="standings-table"
              champion={championUserId}
              movementsByUser={movements}
              {commissionerIds}
            />
          {/if}
          {#if data.viewedSeasonInProgress}
            {@render honorsCard()}
          {/if}
        {/if}

        <!-- The credibility ladder (#637, ungated by #737): career-grain by construction
             (ADR-0032), it now renders beneath the table in BOTH scopes — the standings say you
             beat five friends, the ladder says whether you beat the number, and hiding one
             behind a scope flip was the mutual-exclusion #737 removed. Still a sibling card,
             never a fourth column on the table (#631). Nobody qualified yet is a legitimate
             state, not an error: render nothing rather than a card of dashes (ADR-0032 §5). -->
        {#if hasRatedMember(allTime.ladder)}
          <RatingLadder
            rows={allTime.ladder}
            currentUserId={data.currentUserId}
            showSeasonDelta={showLadderSeasonDelta}
          />
        {/if}

        <!-- The race is the archive tier of the season window (#737): a story you scroll to,
             demoted below the answers ("where do I stand", the honors, the ladder). Renders
             only once a week is graded — the trend is season-scoped, so All-time hides it. -->
        {#if scope !== 'alltime' && hasGradedWeek(pageData.trend ?? [])}
          <Card data-testid="season-race">
            <CardHeader>
              <CardTitle>The race</CardTitle>
              <CardDescription>
                Cumulative points by week — tap a name to trace their run.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SeasonRaceChart rows={pageData.trend ?? []} currentUserId={data.currentUserId} />
            </CardContent>
          </Card>
        {/if}
      </div>
    </TabsContent>

    <TabsContent value="weekly" data-testid="weekly-panel">
      {#if data.view === 'weekly' && data.weeks != null && data.breakdown != null}
        <!-- Week's one control, sitting above everything it drives. -->
        <div data-testid="week-scope-bar" class={SCOPE_BAR_CLASS}>
          <span
            id="week-scope-label"
            class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Week</span
          >
          <WeekNavigator weeks={data.weeks} selectedWeek={data.selectedWeek} />
        </div>

        <div class="mt-4 space-y-4">
          <!-- The week leads with its hardware (#631), then the pick breakdown. The AI recap is a
               link into the Season recaps archive rather than an inline RecapCard, so the tab stays
               tight and the archive remains the one place the prose lives. Hardware exists only for
               fully-graded scoring weeks, so an in-progress week shows the breakdown alone. -->
          {#if selectedHardware}
            <WeeklyHardware
              hardware={selectedHardware}
              currentUserId={data.currentUserId}
              recapHref="/recap?season={data.seasonYear}#week-{selectedHardware.week_number}"
              recapLabel={selectedWeekRecap
                ? `Read the ${weekLabel(data.selectedWeek)} recap`
                : 'Season recaps'}
            />
          {/if}

          <WeeklyPicksBreakdown
            weeks={data.weeks}
            selectedWeek={data.selectedWeek}
            breakdown={data.breakdown}
          />
        </div>
      {:else}
        <p class="text-sm text-muted-foreground">Loading…</p>
      {/if}
    </TabsContent>
  </Tabs>
</section>

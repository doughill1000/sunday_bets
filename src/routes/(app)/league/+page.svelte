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
  import SeasonRaceChart from '$lib/components/leaderboard/SeasonRaceChart.svelte';
  import StandingsTable from '$lib/components/leaderboard/StandingsTable.svelte';
  import SeasonShelf from '$lib/components/recap/SeasonShelf.svelte';
  import LeagueHonors from '$lib/components/group/LeagueHonors.svelte';
  import ChampionCard from '$lib/components/group/ChampionCard.svelte';
  import HonorsStrip from '$lib/components/group/HonorsStrip.svelte';
  import RatingLadder from '$lib/components/leaderboard/RatingLadder.svelte';
  import { hasRatedMember } from '$lib/domain/rating';
  import { seasonScopeOptions } from '$lib/utils/stats';
  import { hasGradedWeek, rankMovements } from '$lib/utils/leaderboardTrend';
  import { ACTIVE_TAB_TRIGGER_CLASS } from '$lib/ui/tabs';
  import Users from '@lucide/svelte/icons/users';

  let { data: pageData }: { data: PageData } = $props();

  // Two page-level views (principle 2, within DESIGN.md's "two or three" allowance): Standings ·
  // Honors, each owning exactly one context control rendered inside its own panel (#631) —
  // Standings the season/All-time window, Honors a season select. #776 returned the third slot
  // (Week) to its own top-level nav destination, relieving the three-view pressure #741 spent.
  // ADR-0035's lane law is the tab boundary: the market lane (table, ladder, race) lives on
  // Standings; the room lane (champion, spoon, titles, shelf) lives in the trophy room. `scope`
  // is a pure client flip; changing the *season* navigates so the season-scoped query re-keys
  // (ADR-0017).
  let activeTab = $state<'standings' | 'honors'>(pageData.view);
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

  // The Honors tab renders the season's trophy shelf (#741). Rather than adding a payload to the
  // server load, it reuses the SAME cached recap query `/recap` and /week already own — one
  // `['recap', groupId, season]` entry serves every surface (ADR-0033, #602), so none can disagree
  // about a week's awards. Gated on the Honors tab so a Standings visitor never pays for it;
  // `+page.ts` prefetches it only on a `?view=honors` request, the one way the shelf is ever
  // server-rendered.
  const recapQuery = createQuery(() => ({
    queryKey: queryKeys.recap(pageData.groupId, pageData.seasonYear),
    queryFn: () => fetchRecap(fetch, pageData.groupId, pageData.seasonYear),
    initialData: pageData.initialRecap,
    enabled: activeTab === 'honors'
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

  // The trophy room's hero (#741): the VIEWED season's champion from the trophy case —
  // rank-1-of-completed-season grain, so an in-progress season has no entry and the card
  // renders its designed "not decided yet" zero-state instead. Ember is reserved for the
  // reigning crown (DESIGN.md P13); browsing 2023 shows its champion in the quiet gold
  // identity treatment.
  const viewedChampion = $derived(
    group.honors.trophyCase.find((c) => c.season_year === data.seasonYear) ?? null
  );
  const viewedChampionIsReigning = $derived(
    viewedChampion != null &&
      viewedChampion.season_year === group.honors.reigningChampion?.season_year
  );
  // W-L-P for the champion card's caption, read off the same season standings the page
  // already holds — SeasonHonor carries points but not the record.
  const viewedChampionRecord = $derived.by(() => {
    if (!viewedChampion) return null;
    const row = data.totals.find((t) => t.user_id === viewedChampion.user_id);
    return row ? `${row.wins}-${row.losses}-${row.pushes}` : null;
  });
  // Zero-state context: who's on top of the live race, through the last graded week. The
  // room may point at the standings' answer, but never restates the table (ADR-0035).
  const lastGradedWeek = $derived(
    (pageData.trend ?? []).reduce((max, t) => Math.max(max, t.week_number), 0)
  );
  const seasonLeaderLine = $derived.by(() => {
    if (!data.viewedSeasonInProgress || lastGradedWeek === 0) return null;
    const leader = data.totals[0];
    return leader ? `${leader.display_name} leads through Week ${lastGradedWeek}` : null;
  });

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
    // Honors has no All-time window (honors are season-grain by construction), so its
    // subtitle always names the season even while Standings' scope sits on All-time.
    if (activeTab === 'honors') return `${data.seasonYear} season.`;
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

  // Honors' one control (#741): the same season navigation as Standings, minus the pinned
  // All-time option — there is no all-time honors view (season-grain by construction), so
  // the room's select never offers a window it can't render.
  function onHonorsSeasonChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value;
    if (value === String(data.seasonYear)) return;
    const url = new URL(window.location.href);
    url.searchParams.set('season', value);
    url.searchParams.set('view', 'honors');
    void goto(url.toString(), { invalidateAll: true, noScroll: true });
  }

  // Standings ↔ Honors is a pure client flip mirrored into the URL with `replaceState` (shareable
  // and reload-safe, like `?scope=alltime`): Honors' payloads all ride the shareable client caches
  // (#741), so neither tab needs a server navigation. Leaving Honors clears the param again.
  $effect(() => {
    const url = new URL(window.location.href);
    const current = url.searchParams.get('view');
    if (activeTab === 'honors' && current !== 'honors') {
      url.searchParams.set('view', 'honors');
      replaceState(url, {});
    } else if (activeTab === 'standings' && current != null) {
      url.searchParams.delete('view');
      replaceState(url, {});
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

{#snippet honorsLoading()}
  <!-- Honors-tab cache miss: the shelf's recap query loads on first tap. A small pulse
       block that keeps the card rhythm (P11) rather than swapping in a spinner. -->
  <Card>
    <CardContent class="space-y-3 p-6" aria-hidden="true">
      {#each [0, 1, 2] as i (i)}
        <div class="h-6 w-full animate-pulse rounded bg-muted"></div>
      {/each}
    </CardContent>
  </Card>
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

<!-- The League home (#561, re-contained by #631, Honors minted by #741, back to two lanes by #776
     which promoted Week to its own nav slot): two self-contained tabs where the tab you're on
     fully governs what's on screen. Only the heading, the Manage action, and the honors strip
     render outside the tab group. The standings testids keep their `leaderboard-` prefix as stable
     e2e anchors (see tests/e2e/helpers/leaderboard-page.ts): the
     content is still the leaderboard, and those anchors stay put across renames. -->
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

  <!-- The honors strip (#741): #727's evergreen champion identity, compressed from the old
       full-height banner into a one-line door that opens the Honors tab. Still the one block
       outside the tab group, and still gold-quiet — the ember moment is the champion card
       inside the room. Hidden while Honors is active: a door has no job inside the room. -->
  {#if group.honors.reigningChampion && activeTab !== 'honors'}
    <HonorsStrip
      reigningChampion={group.honors.reigningChampion}
      currentUserId={data.currentUserId}
      onOpen={() => (activeTab = 'honors')}
    />
  {/if}

  <Tabs bind:value={activeTab} class="w-full space-y-4">
    <TabsList class="grid w-full grid-cols-2 sm:inline-grid sm:w-auto">
      <TabsTrigger
        value="standings"
        data-testid="leaderboard-tab-standings"
        class={ACTIVE_TAB_TRIGGER_CLASS}>Standings</TabsTrigger
      >
      <!-- The trophy room (#741): the curated honors' named home. #776 returned the third tab
           (Week) to its own top-level nav destination, so the bar is back to two lanes. -->
      <TabsTrigger
        value="honors"
        data-testid="leaderboard-tab-honors"
        class={ACTIVE_TAB_TRIGGER_CLASS}>Honors</TabsTrigger
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

      <!-- One lane since #741: the market answers only — table, then ladder, then the race.
           The honors left for their own tab, so #737's crowned-season block ordering retired
           with them: the crown's first paint is now the strip above the tabs, and the room
           itself is one tap away. -->
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

    <!-- The trophy room (#741): the room lane of ADR-0035's boundary — champion, spoon,
         trophy case, season titles, and the weekly-hardware shelf absorbed from /recap.
         Curation leads, volume trails: the hero and titles come before the shelf's
         ~4-per-week gongs, so the room reads as an honors case, not a pile. -->
    <TabsContent value="honors" data-testid="honors-panel">
      <!-- Honors' one control: a season select with no All-time pin (honors are
           season-grain; there is no all-time honors view to offer). -->
      <div data-testid="honors-scope-bar" class={SCOPE_BAR_CLASS}>
        <span
          id="honors-scope-label"
          class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Season</span
        >
        <select
          class={SELECT_CLASS}
          value={String(data.seasonYear)}
          onchange={onHonorsSeasonChange}
          aria-labelledby="honors-scope-label"
          data-testid="honors-season"
        >
          {#if scopeOptions.latest !== null}
            <option value={String(scopeOptions.latest)}>This season · {scopeOptions.latest}</option>
          {:else if scopeOptions.lastCompleted !== null}
            <option value={String(scopeOptions.lastCompleted)}>
              Last season · {scopeOptions.lastCompleted}
            </option>
          {/if}
          {#if scopeOptions.pastSeasons.length > 0}
            <optgroup label="Past seasons">
              {#each scopeOptions.pastSeasons as year (year)}
                <option value={String(year)}>{year}</option>
              {/each}
            </optgroup>
          {/if}
        </select>
      </div>

      <div class="mt-4 space-y-4">
        <!-- The hero: the viewed season's crown, or its honest "not decided yet" (the room's
             one ember element, and only once the crown is real — DESIGN.md P13). -->
        <ChampionCard
          champion={viewedChampion}
          isReigning={viewedChampionIsReigning}
          seasonYear={data.seasonYear}
          seasonInProgress={data.viewedSeasonInProgress}
          record={viewedChampionRecord}
          leaderLine={seasonLeaderLine}
          currentUserId={data.currentUserId}
          onStandings={() => (activeTab = 'standings')}
        />

        {#if data.viewedSeasonInProgress}
          <!-- The spoon's zero-state mirrors the crown's: in play, not missing. The most
               recently minted spoon still shows inside the honors card, year-labelled. -->
          <p class="text-sm text-muted-foreground" data-testid="spoon-in-play">
            🥄 Wooden spoon — in play until the final week grades
          </p>
        {/if}

        <!-- Trophy case, wooden spoon, and awards (#561), lifted from the Standings panel
             (#741) exactly as wave 1 shipped it. Follows the room's season select; also the
             durable doors to Season Wrapped and the recap archive. -->
        <LeagueHonors
          honors={group.honors}
          badges={group.badges}
          members={group.members}
          currentUserId={data.currentUserId}
          selectedSeason={data.seasonYear}
          recapsHref={`/recap?season=${data.seasonYear}`}
        />

        <!-- The season's weekly-hardware shelf, absorbed from /recap (#741): the room's
             in-season pulse — ~4 pieces mint every graded week from Week 1, so the tab is
             alive in October, not just January. /recap keeps the per-week archive. -->
        {#if recapQuery.isPending}
          {@render honorsLoading()}
        {:else if recap.weeklyAwards.shelf.length > 0}
          <SeasonShelf shelf={recap.weeklyAwards.shelf} currentUserId={data.currentUserId} />
        {/if}
      </div>
    </TabsContent>
  </Tabs>
</section>

<script lang="ts">
  import { usePicksStore } from '$lib/stores/picks';
  import { findAllInHolder, pickStatus } from '$lib/domain/rules';
  import { WEIGHTS } from '$lib/domain/scoring';
  import { liveCoverState, weekSoFarPoints, type WeekSoFarPick } from '$lib/domain/liveCover';
  import { fmtPoints } from '$lib/live/display';
  import type { LiveScoreEntry } from '$lib/live/types';
  import type { WeightCode } from '$lib/types/domain';
  import type { PickGame } from '$lib/types/games';

  interface Props {
    games: PickGame[];
    now: number;
    /** Live sweat board (#386). All display-only; grading is untouched. */
    liveScores?: Record<string, LiveScoreEntry>;
    liveFetchedAt?: string | null;
    liveStale?: boolean;
    liveActive?: boolean;
    /** Every in-window game has reported `final` (#823) — the slate is over and the poll has
     *  stopped, so the row holds its number instead of claiming to be live. */
    liveSettled?: boolean;
  }
  let {
    games,
    now,
    liveScores = {},
    liveFetchedAt = null,
    liveStale = false,
    liveActive = false,
    liveSettled = false
  }: Props = $props();
  const picks = usePicksStore();

  // --- Live "week so far" projection (#386) -----------------------------------------------
  // For each of my locked picks that has a live/final score, mirror grading against the live
  // score to get its current verdict, then project points. Display-only, unofficial.
  //
  // Graded games are excluded here and counted from their settled `pointsDelta` below (#823) —
  // the same "graded wins, and the board converges to the graded order" split
  // `assembleWeeklyLiveStandings` uses on the Weekly tab. It matters for a MISSED pick: the live
  // path can't see one (there's no locked pick to project from) but grading settles it with a
  // real penalty, so projecting alone would quietly overstate the week.
  const myLivePicks = $derived.by<WeekSoFarPick[]>(() => {
    const out: WeekSoFarPick[] = [];
    for (const g of games) {
      if (g.finalScores) continue;
      const entry = $picks[g.id];
      const lp = entry?.lockedPick;
      const ls = liveScores[g.id];
      if (!lp || !ls) continue;
      const pickedTeamId = lp.team === 'home' ? g.homeTeamId : g.awayTeamId;
      const state = liveCoverState({
        homeScore: ls.homeScore,
        awayScore: ls.awayScore,
        homeTeamId: g.homeTeamId,
        awayTeamId: g.awayTeamId,
        pickedTeamId,
        lockedSpreadTeamId: entry?.lockedSpreadTeamId ?? g.spreadTeamId,
        lockedSpreadValue: entry?.lockedSpreadValue ?? g.spreadValue
      });
      out.push({ weight: lp.weight, verdict: state?.verdict ?? null });
    }
    return out;
  });

  // My settled games this week: authoritative points, already carrying any missed-pick penalty.
  const myGraded = $derived(
    games
      .filter((g) => g.finalScores && $picks[g.id]?.outcome != null)
      .map((g) => $picks[g.id]?.pointsDelta ?? 0)
  );

  const decidedCount = $derived(
    myLivePicks.filter((p) => p.verdict != null).length + myGraded.length
  );
  const weekSoFar = $derived(
    myGraded.reduce((sum, pts) => sum + pts, 0) + weekSoFarPoints(myLivePicks)
  );
  // Show the row only when the week is in play AND at least one of my picks is decided.
  const showLive = $derived(liveActive && decidedCount > 0);

  const fetchedAgeSec = $derived(
    liveFetchedAt ? Math.max(0, Math.round((now - new Date(liveFetchedAt).getTime()) / 1000)) : null
  );

  const statuses = $derived(games.map((g) => pickStatus($picks[g.id], g.kickoff, now)));
  const savedCount = $derived(statuses.filter((s) => s === 'saved').length);
  const openCount = $derived(statuses.filter((s) => s === 'open').length);
  const missedCount = $derived(statuses.filter((s) => s === 'missed').length);

  // The week's single All-In, saved or staged (locked takes precedence).
  const allIn = $derived(findAllInHolder(games, $picks));
  const allInTeam = $derived(
    allIn ? (allIn.team === 'home' ? allIn.game.home : allIn.game.away) : null
  );

  const weightCounts = $derived(
    (Object.keys(WEIGHTS) as WeightCode[])
      .map((code) => ({
        code,
        count: games.filter((g) => $picks[g.id]?.lockedPick?.weight === code).length
      }))
      .filter((w) => w.count > 0)
  );
</script>

<div
  class="sticky top-14 z-30 -mx-4 border-b bg-background/95 backdrop-blur-sm"
  style="padding: 0.5rem max(1rem, env(safe-area-inset-right)) 0.5rem max(1rem, env(safe-area-inset-left))"
>
  <!-- Primary: saved/total counter + status -->
  <div class="flex items-center gap-2 text-sm">
    <span class="font-semibold" data-testid="saved-counter">{savedCount}/{games.length} saved</span>
    {#if openCount > 0}
      <span class="text-warning" data-testid="open-count">· {openCount} to pick</span>
    {:else if savedCount > 0}
      <!-- Carries the done-state the standalone "You're all set" card used to announce (#787).
           `openCount === 0` is exactly `upcoming.length === 0` (pickStatus: a game is 'open'
           iff it's unlocked with a future kickoff), so this fires on the same condition the
           card did. Stays muted when picks were missed, so a clean-sweep green never sits
           next to the destructive "N missed" count on the row below. -->
      <span class={missedCount > 0 ? 'text-muted-foreground' : 'text-success'} data-testid="all-set"
        >✓ All set</span
      >
    {/if}
  </div>

  <!-- Detail row: quiet secondary info -->
  <div class="mt-0.5 flex items-center gap-x-2 text-xs text-muted-foreground">
    <!-- All-In -->
    {#if allIn?.locked}
      <span data-testid="all-in-summary"
        >All-In: <span class="font-medium text-foreground">{allInTeam}</span> ✓</span
      >
    {:else if allIn}
      <span class="text-warning" data-testid="all-in-summary"
        >All-In: {allInTeam} · not locked in yet</span
      >
    {:else if openCount > 0}
      <span class="text-warning" data-testid="all-in-summary">No All-In</span>
    {:else}
      <span data-testid="all-in-summary">No All-In</span>
    {/if}

    <!-- Missed -->
    {#if missedCount > 0}
      <span aria-hidden="true">·</span>
      <span class="font-medium text-destructive">{missedCount} missed</span>
    {/if}

    <!-- Weight breakdown -->
    {#if weightCounts.length > 0}
      <span class="ml-auto flex items-center gap-2">
        {#each weightCounts as w (w.code)}
          <span>{w.code} <span class="font-semibold text-foreground">{w.count}</span></span>
        {/each}
      </span>
    {/if}
  </div>

  <!-- Live "week so far" (#386) — unofficial, display-only. Yields to graded standings. -->
  {#if showLive}
    <div
      class="mt-1 flex items-center gap-x-2 border-t pt-1 text-xs"
      data-testid="week-so-far"
      aria-live="polite"
    >
      {#if liveStale}
        <span class="inline-flex items-center gap-1 font-semibold text-muted-foreground">
          <span class="size-1.5 rounded-full bg-muted-foreground"></span>
          Stale · reconnecting
        </span>
      {:else if liveSettled}
        <!-- Nothing is still moving, so don't pulse LIVE at it. The 12h window (#823) means this
             state can sit on screen for hours waiting on the grade cron; "unofficial" below is
             still the honest caveat, but the number itself has stopped changing. -->
        <span class="inline-flex items-center gap-1 font-semibold text-destructive">
          <span class="size-1.5 rounded-full bg-destructive"></span>
          FINAL
        </span>
      {:else}
        <span class="inline-flex items-center gap-1 font-semibold text-destructive">
          <span class="size-1.5 animate-pulse rounded-full bg-destructive"></span>
          LIVE
        </span>
      {/if}

      <span class="text-muted-foreground">Week so far</span>
      <span
        class="font-semibold tabular-nums {weekSoFar > 0
          ? 'text-success'
          : weekSoFar < 0
            ? 'text-destructive'
            : 'text-foreground'}"
        data-testid="week-so-far-points"
      >
        {weekSoFar > 0 ? '+' : ''}{fmtPoints(weekSoFar)}
      </span>
      <span class="text-muted-foreground">· unofficial</span>

      <span class="ml-auto text-[11px] text-muted-foreground" data-testid="freshness-stamp">
        {#if liveStale}
          reconnecting…
        {:else if liveSettled}
          <!-- An age counter on a number that will never change again is noise; say what the
               board is actually waiting on instead. -->
          Awaiting grade
        {:else if fetchedAgeSec != null}
          Updated {fetchedAgeSec}s ago
        {:else}
          Connecting…
        {/if}
      </span>
    </div>
  {/if}
</div>

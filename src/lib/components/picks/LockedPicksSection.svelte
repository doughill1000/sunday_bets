<script lang="ts">
  import { fly, scale } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
  import { prefersReducedMotion } from 'svelte/motion';
  import { lockMotionMs } from '$lib/ui/motion';
  import { usePicksStore } from '$lib/stores/picks';
  import { unlockPick as unlockPickApi } from '$lib/api/picks';
  import { signedSpreadForTeam } from '$lib/domain/spread';
  import { resolvePickResult } from '$lib/domain/pickResult';
  import { verdictTextClass, verdictLabel } from '$lib/live/display';
  import { outcomeTextClass, outcomeLabel } from '$lib/ui/outcome';
  import { toast } from 'svelte-sonner';
  import type { PickGame } from '$lib/types/games';
  import type { SocialComment } from '$lib/server/db/queries/getCommentsForGame';
  import CommentsSection from './CommentsSection.svelte';
  import type { GroupPickEntry } from '$lib/types/picks';
  import type { LiveScoreEntry } from '$lib/live/types';
  import RevealedGroupPicks from './RevealedGroupPicks.svelte';
  import FormNote from '$lib/components/FormNote.svelte';

  type SocialData = { comments: SocialComment[] };

  interface Props {
    games: PickGame[];
    now: number;
    social?: Record<string, SocialData>;
    groupPicks?: GroupPickEntry[];
    /** Live sweat board (#386) — display-only per-pick cover state. */
    liveScores?: Record<string, LiveScoreEntry>;
    liveStale?: boolean;
    userId?: string | null;
    currentUserDisplayName?: string | null;
    /** Frozen/read-only mode (#669) — see `PicksBoard`'s `readonly` doc; hides the Unlock
     *  action, which would otherwise call the real unlock RPC. */
    readonly?: boolean;
  }
  let {
    games,
    now,
    social = {},
    groupPicks = [],
    liveScores = {},
    liveStale = false,
    userId = null,
    currentUserDisplayName = null,
    readonly = false
  }: Props = $props();
  const picks = usePicksStore();

  function kickoffMs(g: PickGame) {
    return new Date(g.kickoff).getTime();
  }

  // How this row's pick reads right now: the settled result once grading has run, otherwise the
  // display-only live mirror, otherwise nothing (#823). The precedence — and the reason a graded
  // result can never be superseded by a live payload — lives in `resolvePickResult`, so this
  // component just renders whichever state it's handed.
  function myResult(g: PickGame) {
    return resolvePickResult({
      entry: $picks[g.id],
      game: g,
      liveScore: liveScores[g.id],
      liveStale
    });
  }

  const hasMissed = $derived(games.some((g) => kickoffMs(g) <= now && !$picks[g.id]?.lockedPick));

  // Enter/exit duration for the committed row as a pick lands here on lock (or
  // leaves on unlock). Matches the exit on the upcoming card in PicksBoard;
  // `prefersReducedMotion` collapses it to 0 (instant). The keyed `{#each}` (by
  // `g.id`) keeps the 1s `now` ticker from restarting a row's in-flight
  // transition. See `$lib/ui/motion` and issue #478.
  const motionMs = $derived(lockMotionMs(prefersReducedMotion.current));

  // Default open (most people want to glance at their locked picks right after
  // making them). `open` only tracks user/missed-pick intent from here on — the
  // ticking `now` prop must never re-assert it, or the section snaps shut on
  // every 1s tick while someone is trying to expand it.
  let sectionOpen = $state(true);

  $effect(() => {
    if (hasMissed) sectionOpen = true;
  });

  function picksForGame(gameId: string) {
    return groupPicks.filter((p) => p.gameId === gameId);
  }

  async function onEdit(g: PickGame) {
    const res = await unlockPickApi(g.id);
    if (!res.ok) {
      toast.error('Unlock failed');
      return;
    }
    picks.update((s) => ({
      ...s,
      [g.id]: { ...(s[g.id] ?? {}), lockedPick: undefined }
    }));
    requestAnimationFrame(() => {
      document
        .getElementById(`game-${g.id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
</script>

{#if games.length > 0}
  <details bind:open={sectionOpen} class="group mt-4" data-testid="committed-section">
    <summary
      data-testid="committed-summary"
      class="flex cursor-pointer list-none items-center gap-2 rounded-lg px-1 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase select-none hover:text-foreground"
    >
      <svg
        class="size-4 transition-transform group-open:rotate-90"
        viewBox="0 0 16 16"
        fill="currentColor"
      >
        <path d="M6 4l4 4-4 4V4z" />
      </svg>
      <!-- The count moved out of the visible label (#787) but has to stay in the accessible
           name — "Committed" alone doesn't say what it counts. The separator is `&nbsp;`
           because Svelte trims leading whitespace inside an element, which would otherwise
           announce this as "Committedpicks (1)". -->
      Committed<span class="sr-only">&nbsp;picks ({games.length})</span>
      {#if hasMissed}
        <span
          class="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive"
          >missed</span
        >
      {/if}
    </summary>

    <div class="mt-1 divide-y rounded-lg border">
      {#each games as g (g.id)}
        {@const entry = $picks[g.id]}
        {@const started = kickoffMs(g) <= now}
        {@const lp = entry?.lockedPick}
        <div
          class="px-3 py-2 text-sm"
          data-testid="committed-row"
          data-game-id={g.id}
          transition:fly={{ duration: motionMs, y: -6 }}
        >
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium" data-testid="committed-matchup">
                {g.away} @ {g.home}
              </p>
              {#if lp}
                <p class="truncate text-xs text-muted-foreground" data-testid="committed-detail">
                  {lp.team === 'home' ? g.home : g.away}{signedSpreadForTeam(g, lp.team)}
                  · {lp.weight}
                </p>
              {:else}
                <p class="text-xs font-medium text-destructive" data-testid="committed-detail">
                  No pick recorded
                </p>
              {/if}
              {#if entry?.saveError}
                <FormNote kind="warning" text={entry.saveError} class="mt-1 px-2 py-1" />
              {/if}
            </div>

            <div class="flex shrink-0 items-center gap-2">
              {#if started}
                {@const result = myResult(g)}
                {#if result?.kind === 'graded'}
                  <!-- Settled and done: calm muted "Final", no dot and no pulse. The live chip
                       below keeps the red dot and the shouty uppercase precisely so the two
                       don't read alike — an unofficial score is still moving, this one isn't. -->
                  <span class="text-xs font-medium text-muted-foreground" data-testid="graded-flag">
                    Final
                  </span>
                {:else if result}
                  {@const stale = result.kind === 'live' && result.stale}
                  <span
                    class="inline-flex items-center gap-1 text-xs font-semibold {stale
                      ? 'text-muted-foreground'
                      : 'text-destructive'}"
                    data-testid="live-flag"
                  >
                    <span
                      class="size-1.5 rounded-full {stale
                        ? 'bg-muted-foreground'
                        : 'bg-destructive'} {result.kind === 'live' && !stale
                        ? 'animate-pulse'
                        : ''}"
                    ></span>
                    {result.kind === 'unofficial' ? 'FINAL' : stale ? 'Stale' : 'LIVE'}
                  </span>
                {:else}
                  <span class="text-xs text-muted-foreground">⏱ Kicked off</span>
                {/if}
              {:else}
                <!-- Status, not a control (#787). This used to be a filled `Badge variant="secondary"`
                   sitting beside a muted ghost button, so the element you *can't* press outweighed
                   the one you can, and the twin lock emoji made the pair read as a segmented
                   toggle. Flat text matches its own siblings above — "⏱ Kicked off", LIVE, FINAL —
                   and leaves Unlock as the only bordered thing on the row (DESIGN.md principle 5:
                   keep `status` and `actionable` visually distinct). The scale-in still plays; it
                   wraps the status element, not the badge chrome. -->
                <span
                  class="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"
                  in:scale={{ duration: motionMs, start: 0.85, opacity: 1, easing: backOut }}
                >
                  <span aria-hidden="true">🔒</span> Locked
                </span>
                {#if !readonly}
                  <button
                    class="rounded border px-2 py-0.5 text-xs font-medium text-foreground underline-offset-2 hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    data-testid="unlock-pick"
                    onclick={() => onEdit(g)}
                  >
                    Unlock
                  </button>
                {/if}
              {/if}
            </div>
          </div>

          {#if started}
            {@const result = myResult(g)}
            {#if result?.kind === 'graded'}
              {@const label = outcomeLabel(result.outcome, result.pointsDelta)}
              <div class="mt-1 flex items-center gap-2 text-xs" data-testid="graded-result">
                <span class="text-muted-foreground tabular-nums">
                  {g.away}
                  {result.awayScore}–{result.homeScore}
                  {g.home}
                </span>
                {#if label}
                  <!-- Points, not a spread cushion — hence "Win +3" rather than the live row's
                       "Covering +3". No outcome renders no label at all: grading wrote nothing
                       for this member (e.g. the ADR-0037 participation boundary), and the score
                       alone is still worth showing. -->
                  <span
                    class="ml-auto font-semibold {outcomeTextClass(result.outcome)}"
                    data-testid="graded-outcome"
                  >
                    {label}
                  </span>
                {/if}
              </div>
            {:else if result}
              {@const stale = result.kind === 'live' && result.stale}
              <div class="mt-1 flex items-center gap-2 text-xs" data-testid="live-cover">
                <span class="text-muted-foreground tabular-nums">
                  {g.away}
                  {result.score.awayScore}–{result.score.homeScore}
                  {g.home}
                  {#if result.kind === 'live' && result.score.period}
                    · Q{result.score.period}
                    {result.score.displayClock ?? ''}
                  {:else if result.kind === 'unofficial'}
                    · unofficial
                  {/if}
                </span>
                <span
                  class="ml-auto font-semibold {stale
                    ? 'text-muted-foreground'
                    : verdictTextClass(result.cover.verdict)}"
                  data-testid="live-verdict"
                >
                  {verdictLabel(result.cover.verdict, result.cover.cushion)}
                </span>
              </div>
            {/if}
          {/if}

          {#if started && userId}
            <!-- Graded beats live for the group dots too (#823). The two can coexist now that
                 the window is wide enough to still be open when the grade cron runs, and a
                 provisional dot over a settled game asserts something that is no longer true.
                 Dropping the score falls back to no dots rather than to a wrong colour — the
                 settled per-member results are the Week tab's job, not this row's. -->
            <RevealedGroupPicks
              picks={picksForGame(g.id)}
              myUserId={userId}
              game={g}
              liveScore={g.finalScores ? null : (liveScores[g.id] ?? null)}
              {liveStale}
            />
          {/if}
        </div>

        {#if started && social[g.id]}
          <div class="px-3 pb-3">
            <CommentsSection
              gameId={g.id}
              comments={social[g.id].comments}
              currentUserId={userId}
              {currentUserDisplayName}
            />
          </div>
        {/if}
      {/each}
    </div>
  </details>
{/if}

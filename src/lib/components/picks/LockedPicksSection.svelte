<script lang="ts">
  import { fly, scale } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
  import { prefersReducedMotion } from 'svelte/motion';
  import { lockMotionMs } from '$lib/ui/motion';
  import { usePicksStore } from '$lib/stores/picks';
  import { unlockPick as unlockPickApi } from '$lib/api/picks';
  import { signedSpreadForTeam } from '$lib/domain/spread';
  import { liveCoverState } from '$lib/domain/liveCover';
  import { verdictTextClass, verdictLabel } from '$lib/live/display';
  import { toast } from 'svelte-sonner';
  import type { PickGame } from '$lib/types/games';
  import type { CommentRow } from '$lib/server/db/queries/getCommentsForGame';
  import CommentsSection from './CommentsSection.svelte';
  import type { GroupPickEntry } from '$lib/types/picks';
  import type { LiveScoreEntry } from '$lib/live/types';
  import RevealedGroupPicks from './RevealedGroupPicks.svelte';
  import { Badge } from '$lib/components/ui/badge';
  import FormNote from '$lib/components/FormNote.svelte';

  type SocialData = { comments: CommentRow[] };

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

  // Live cover state for my locked pick on a game, or null when there's no live score / no
  // pick. Mirrors grading against the live score using the line frozen on my pick (#386).
  function myCover(g: PickGame) {
    const entry = $picks[g.id];
    const lp = entry?.lockedPick;
    const ls = liveScores[g.id];
    if (!lp || !ls) return null;
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
    return state ? { ...state, score: ls } : null;
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
      class="flex cursor-pointer select-none list-none items-center gap-2 rounded-lg px-1 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <svg
        class="size-4 transition-transform group-open:rotate-90"
        viewBox="0 0 16 16"
        fill="currentColor"
      >
        <path d="M6 4l4 4-4 4V4z" />
      </svg>
      {games.length} committed pick{games.length === 1 ? '' : 's'}
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
                {@const cover = myCover(g)}
                {#if cover}
                  <span
                    class="inline-flex items-center gap-1 text-xs font-semibold {liveStale
                      ? 'text-muted-foreground'
                      : 'text-destructive'}"
                    data-testid="live-flag"
                  >
                    <span
                      class="size-1.5 rounded-full {liveStale
                        ? 'bg-muted-foreground'
                        : 'bg-destructive'} {cover.score.status === 'in_progress' && !liveStale
                        ? 'animate-pulse'
                        : ''}"
                    ></span>
                    {liveStale ? 'Stale' : cover.score.status === 'final' ? 'FINAL' : 'LIVE'}
                  </span>
                {:else}
                  <span class="text-xs text-muted-foreground">⏱ Kicked off</span>
                {/if}
              {:else}
                <span in:scale={{ duration: motionMs, start: 0.85, opacity: 1, easing: backOut }}>
                  <Badge variant="secondary">🔒 Locked</Badge>
                </span>
                {#if !readonly}
                  <button
                    class="rounded border px-2 py-0.5 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    data-testid="unlock-pick"
                    onclick={() => onEdit(g)}
                  >
                    🔓 Unlock
                  </button>
                {/if}
              {/if}
            </div>
          </div>

          {#if started}
            {@const cover = myCover(g)}
            {#if cover}
              <div class="mt-1 flex items-center gap-2 text-xs" data-testid="live-cover">
                <span class="tabular-nums text-muted-foreground">
                  {g.away}
                  {cover.score.awayScore}–{cover.score.homeScore}
                  {g.home}
                  {#if cover.score.status === 'in_progress' && cover.score.period}
                    · Q{cover.score.period}
                    {cover.score.displayClock ?? ''}
                  {:else if cover.score.status === 'final'}
                    · unofficial
                  {/if}
                </span>
                <span
                  class="ml-auto font-semibold {liveStale
                    ? 'text-muted-foreground'
                    : verdictTextClass(cover.verdict)}"
                  data-testid="live-verdict"
                >
                  {verdictLabel(cover.verdict, cover.cushion)}
                </span>
              </div>
            {/if}
          {/if}

          {#if started && userId}
            <RevealedGroupPicks
              picks={picksForGame(g.id)}
              myUserId={userId}
              game={g}
              liveScore={liveScores[g.id] ?? null}
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

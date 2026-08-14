<script lang="ts">
  import { weekUnderwayCounts } from '$lib/domain/weekUnderway';
  import { fmtPoints } from '$lib/live/display';
  import type { PickGame } from '$lib/types/games';
  import { usePicksStore } from '$lib/stores/picks';

  // The `/picks` handoff strip (#832). Kickoff is a hard boundary on this page: a game that has
  // started leaves the board — live, final-unofficial and graded alike — and is represented here
  // instead, as one line that hands off to `/week`.
  //
  // Everything it shows comes from the server load (graded final scores + my settled outcomes).
  // It never polls, and `/picks` opens no live-scores query in any state — that duplication of
  // `/week`'s live layer is exactly what this component replaces (it produced #822 and #823).
  // The consequence is deliberate: the counts are as fresh as the page, and anything genuinely
  // live is one tap away on the board that owns it.
  interface Props {
    /** The games that have kicked off, already split out by the board. */
    games: PickGame[];
    /** Where the handoff points. The public demo mirrors this board against its own frozen
     *  `/demo/week` (the `wrappedHref`/`recapsHref` convention `LeagueHonors` already uses). */
    weekHref?: string;
  }
  let { games, weekHref = '/week' }: Props = $props();

  const picks = usePicksStore();
  const counts = $derived(weekUnderwayCounts(games, $picks));

  // "N in play · N final" — only the halves that exist, so a fully-graded week doesn't read
  // "0 in play · 13 final".
  type StatePart = { key: string; text: string };
  const stateParts = $derived(
    [
      counts.inPlay > 0 ? { key: 'in-play', text: `${counts.inPlay} in play` } : null,
      counts.final > 0 ? { key: 'final', text: `${counts.final} final` } : null
    ].filter((p): p is StatePart => p !== null)
  );

  const pointsClass = $derived(
    counts.settledPoints > 0
      ? 'text-success'
      : counts.settledPoints < 0
        ? 'text-destructive'
        : 'text-foreground'
  );
</script>

{#if counts.total > 0}
  <section
    class="mt-4 overflow-hidden rounded-lg border bg-card"
    data-testid="week-underway-strip"
    aria-labelledby="week-underway-heading"
  >
    <div class="p-3">
      <div class="flex items-center gap-2">
        {#if counts.inPlay > 0}
          <!-- Same live dot as the Week nav tab (#776) and the weekly board, so "games are on"
               reads identically wherever it appears. Decorative: the "N in play" count below is
               the non-colour cue. -->
          <span
            class="size-1.5 shrink-0 animate-pulse rounded-full bg-destructive"
            aria-hidden="true"
          ></span>
        {/if}
        <h2 id="week-underway-heading" class="text-sm font-semibold">The week is underway</h2>
        {#if counts.settledCount > 0}
          <span class="ml-auto shrink-0 text-xs text-muted-foreground">
            <span class="font-semibold tabular-nums {pointsClass}" data-testid="underway-points">
              {counts.settledPoints > 0 ? '+' : ''}{fmtPoints(counts.settledPoints)}
            </span>
            so far
          </span>
        {/if}
      </div>

      <p class="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
        {#each stateParts as part, i (part.key)}
          {#if i > 0}<span aria-hidden="true">·</span>{/if}
          <span data-testid="underway-{part.key}">{part.text}</span>
        {/each}
        {#if counts.missed > 0}
          <!-- The missed moment's new home. It used to live on the red "No pick recorded"
               committed row, which kickoff now removes from this page — so it keeps the same
               destructive pill treatment the committed summary's badge used, rather than
               becoming one more muted word in a list. -->
          <span
            class="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive"
            data-testid="underway-missed"
          >
            {counts.missed} missed
          </span>
        {/if}
      </p>
    </div>

    <!-- The strip's one action, given its own full-width row so it stays a comfortable tap
         target at 390px and is the obvious next move when every game has kicked off and this
         is the only thing left on the page. -->
    <a
      href={weekHref}
      class="flex items-center gap-2 border-t px-3 py-2.5 text-sm font-medium hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      data-testid="see-the-week"
    >
      See the Week
      <span class="ml-auto text-muted-foreground" aria-hidden="true">→</span>
    </a>
  </section>
{/if}

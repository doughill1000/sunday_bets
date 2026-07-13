<script lang="ts">
  import { flip } from 'svelte/animate';
  import { prefersReducedMotion } from 'svelte/motion';
  import { Card, CardContent } from '$lib/components/ui/card';
  import UserAvatar from '$lib/components/UserAvatar.svelte';
  import { fmtPoints } from '$lib/live/display';
  import type { WeeklyLiveStanding } from '$lib/types/leaderboard';

  interface Props {
    standings: WeeklyLiveStanding[];
    /** A game in the selected week is inside its live window — drives the live skin. */
    live?: boolean;
    /** The live feed has gone stale; the board keeps its last order but stops asserting "live". */
    stale?: boolean;
    /** Honest age of the last real ESPN fetch (drives the "Updated Ns ago" stamp). */
    fetchedAt?: string | null;
    /** 1s-ticking clock from the parent, so the freshness caption counts up. */
    now?: number;
  }
  let {
    standings,
    live = false,
    stale = false,
    fetchedAt = null,
    now = Date.now()
  }: Props = $props();

  // Reorder animation as covers flip; collapses to instant under reduced-motion.
  const motionMs = $derived(prefersReducedMotion.current ? 0 : 350);

  const fetchedAgeSec = $derived(
    fetchedAt ? Math.max(0, Math.round((now - new Date(fetchedAt).getTime()) / 1000)) : null
  );

  function pointsClass(points: number) {
    return points > 0 ? 'text-success' : points < 0 ? 'text-destructive' : 'text-muted-foreground';
  }

  function subline(s: WeeklyLiveStanding) {
    if (s.pickCount === 0) return 'No picks';
    return `${s.decided} of ${s.pickCount} in`;
  }
</script>

<Card data-testid="weekly-live-board">
  <CardContent class="space-y-1 p-3 sm:p-4">
    <!-- Header: title + live/unofficial framing + freshness. A provisional board is a louder
         "this could be wrong" than a single card, so it wears the unofficial voice up top. -->
    <div class="mb-1 flex items-center gap-2 text-xs" aria-live="polite">
      <span class="font-semibold tracking-tight">This week{live ? ' — live' : ''}</span>

      {#if live}
        {#if stale}
          <span
            class="inline-flex items-center gap-1 font-semibold text-muted-foreground"
            data-testid="live-board-status"
          >
            <span class="size-1.5 rounded-full bg-muted-foreground"></span>
            Stale · reconnecting
          </span>
        {:else}
          <span
            class="inline-flex items-center gap-1 font-semibold text-destructive"
            data-testid="live-board-status"
          >
            <span class="size-1.5 animate-pulse rounded-full bg-destructive"></span>
            LIVE
          </span>
        {/if}
        <span class="text-muted-foreground">· unofficial</span>
      {/if}

      <span class="ml-auto text-[11px] text-muted-foreground" data-testid="live-board-freshness">
        {#if !live}
          Final for this week
        {:else if stale}
          reconnecting…
        {:else if fetchedAgeSec != null}
          Updated {fetchedAgeSec}s ago
        {:else}
          Connecting…
        {/if}
      </span>
    </div>

    <ul class="space-y-0.5">
      {#each standings as s (s.userId)}
        <li
          animate:flip={{ duration: motionMs }}
          data-testid="live-board-row"
          class="grid grid-cols-[1.5rem_auto_1fr_auto] items-center gap-2 rounded-md px-1.5 py-1 {s.isYou
            ? 'bg-primary/10 font-semibold'
            : s.rank === 1
              ? 'bg-muted/40'
              : ''}"
        >
          <span class="text-center text-xs tabular-nums text-muted-foreground">{s.rank}</span>
          <UserAvatar size="xs" avatarKey={s.avatarKey} displayName={s.displayName} />
          <div class="min-w-0 leading-tight">
            <div class="truncate text-sm">{s.isYou ? `${s.displayName} (you)` : s.displayName}</div>
            <div class="text-[11px] font-normal text-muted-foreground">{subline(s)}</div>
          </div>
          <span
            class="text-right text-sm font-semibold tabular-nums {pointsClass(s.points)}"
            data-testid="live-board-points"
          >
            {s.points > 0 ? '+' : ''}{fmtPoints(s.points)}
          </span>
        </li>
      {/each}
    </ul>

    {#if live && !stale}
      <p class="px-1.5 pt-1 text-[11px] text-muted-foreground">
        Reorders live as covers flip · unofficial until grading settles.
      </p>
    {/if}
  </CardContent>
</Card>

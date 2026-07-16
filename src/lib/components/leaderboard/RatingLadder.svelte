<script lang="ts">
  // The All-time credibility ladder (#637): every member's career rating and tier, under the
  // All-time standings table on /league. The point of putting it there is that the two facts finally
  // sit on one screen — the table says you beat five friends, the ladder says whether you beat the
  // number, and only one of those is impressive in absolute terms. It is career-grain like the
  // rating itself (ADR-0032), which is why it renders under the All-time window and nowhere else.
  //
  // A bar you clear, not a contest you win: more than one player can be Hotshot, nobody clearing it
  // is a legitimate year, and trailing it is a band you sit in rather than a crown you get mocked
  // with. Pure presentation over `ratingLadder` — no thresholds re-implemented here; the tier
  // vocabulary comes from the shared pill and the meter from the shared CoverMeter, whose 50%
  // baseline tick IS market par (`meterPct` maps RATING_PAR to exactly 50).
  import {
    RATING_PAR,
    MIN_QUALIFIED_DECISIONS,
    meterPct,
    ratingTier,
    type RatingLadderRow
  } from '$lib/domain/rating';
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
  } from '$lib/components/ui/card';
  import CoverMeter from '$lib/components/CoverMeter.svelte';
  import RatingTierPill from '$lib/components/RatingTierPill.svelte';
  import UserAvatar from '$lib/components/UserAvatar.svelte';

  let {
    rows,
    currentUserId
  }: {
    /** Ladder rows, already ordered and dense-ranked by `ratingLadder`. */
    rows: RatingLadderRow[];
    /** The viewer, highlighted the same way the standings table highlights their row. */
    currentUserId: string | null;
  } = $props();
</script>

<Card data-testid="rating-ladder">
  <CardHeader>
    <CardTitle>Market credibility</CardTitle>
    <CardDescription>
      Career rating vs the spread you locked your pick against. {RATING_PAR} = market par; it carries
      across seasons.
    </CardDescription>
  </CardHeader>
  <CardContent class="space-y-3 px-3 sm:px-6">
    {#each rows as row (row.user_id)}
      {@const entry = row.entry}
      {@const rated = entry.rating != null}
      {@const tier = rated && entry.rating != null ? ratingTier(entry.rating) : null}
      {@const isYou = row.user_id === currentUserId}
      <div
        class="rounded-lg px-2 py-2 {isYou ? 'bg-primary/10 font-semibold' : ''}"
        data-testid="rating-ladder-row"
      >
        <div class="flex items-center gap-2">
          <!-- Rank sits in a fixed-width slot so the names line up; an Unrated player has no rank
               (no verdict yet), and shows a dash rather than a rank they haven't earned. -->
          <span class="w-5 shrink-0 text-center text-xs tabular-nums text-muted-foreground">
            {row.rank ?? '—'}
          </span>
          <UserAvatar avatarKey={row.avatar_key} displayName={row.display_name} size="xs" />
          <!-- min-w-0 + truncate: the name yields first so the rating and tier on the right can
               never be pushed off a 390px screen. -->
          <span class="min-w-0 flex-1 truncate text-sm">
            {isYou ? `${row.display_name} (you)` : row.display_name}
          </span>
          {#if rated && entry.rating != null}
            <span class="text-sm font-semibold tabular-nums">{entry.rating}</span>
            <!-- The season arrow is a delta INSIDE the career ladder, not a season scope: it says
                 how much this season moved the career number, which is still a career fact. -->
            {#if entry.seasonDelta != null && entry.seasonDelta !== 0}
              <span
                class="text-xs font-semibold tabular-nums {entry.seasonDelta > 0
                  ? 'text-success'
                  : 'text-destructive'}"
                aria-label="{entry.seasonDelta > 0 ? 'up' : 'down'} {Math.abs(
                  entry.seasonDelta
                )} this season"
              >
                {entry.seasonDelta > 0 ? '▲' : '▼'}{Math.abs(entry.seasonDelta)}
              </span>
            {/if}
          {:else}
            <span class="text-xs text-muted-foreground whitespace-nowrap">
              {entry.decisionsToQualify} to go
            </span>
          {/if}
          <RatingTierPill {tier} />
        </div>
        <!-- Rated: the meter's midpoint tick is par, so above/below the market reads from the shape
             before the number. Unrated: progress toward the gate instead, so the row still says
             something true rather than rendering an empty track at par. -->
        <div class="mt-1.5 pl-7">
          {#if rated && entry.rating != null}
            <CoverMeter pct={meterPct(entry.rating) / 100} hot={tier === 'hotshot'} />
          {:else}
            <div class="h-2 w-full overflow-hidden rounded-full bg-foreground/10">
              <div
                class="h-full rounded-full bg-muted-foreground"
                style="width: {Math.min(100, (entry.decisions / MIN_QUALIFIED_DECISIONS) * 100)}%"
              ></div>
            </div>
          {/if}
        </div>
      </div>
    {/each}
    <p class="text-xs text-muted-foreground">
      A rating unlocks at {MIN_QUALIFIED_DECISIONS} settled decisions.
    </p>
  </CardContent>
</Card>

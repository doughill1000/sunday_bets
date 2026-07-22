<script lang="ts">
  // Scope-aware stats hero (issue #567): the single card leading the scoped content on /stats,
  // replacing the three stacked preamble cards (YourEdge + CareerSummary/season-snapshot +
  // SignatureTendencies). Its two halves — the headline number line (Record · ATS% · Decisions)
  // and the signature tells — both follow the season/Career scope, so one dropdown re-scopes the
  // whole hero. Analytics only: standings/rank live on the Leaderboard (ADR-0018), so no
  // "Standings points" tile appears here. Pure presentation over already-derived values.
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
  } from '$lib/components/ui/card';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import { formatAccuracy } from '$lib/utils/stats';
  import type { SignatureTell } from '$lib/utils/stats';
  import { ratingTier, tierLabel, type PlayerRatingEntry } from '$lib/domain/rating';
  import SignatureTells from './SignatureTells.svelte';
  import RatingBand from './RatingBand.svelte';
  import RatingTierPill from '$lib/components/RatingTierPill.svelte';

  let {
    isYou,
    displayName,
    scopeLabel,
    wins,
    losses,
    pushes,
    missed,
    atsAccuracy,
    decisions,
    tells,
    rating,
    careerRating
  }: {
    isYou: boolean;
    displayName: string;
    /** Human scope label the hero follows, e.g. "Career" or "2025". */
    scopeLabel: string;
    wins: number;
    losses: number;
    pushes: number;
    missed: number;
    /** Cover rate for the scope, or null when there are no decided picks yet. */
    atsAccuracy: number | null;
    decisions: number;
    /** Ranked signature tells for the same scope (career or season). */
    tells: SignatureTell[];
    /** Cross-season credibility rating (#361), shown only at Career scope — it leads the hero,
     *  demoting Record / ATS% / Decisions to the receipts beneath it. Omitted at season scope. */
    rating?: { entry: PlayerRatingEntry | undefined; rank: number | null };
    /** The SAME career rating, shown only at season scope as the compact chip below (#738).
     *  Exactly one of `rating` / `careerRating` is ever passed — the shape is shared because it
     *  is one number wearing two sizes: the Career hero's headline, the season hero's footnote. */
    careerRating?: { entry: PlayerRatingEntry | undefined; rank: number | null };
  } = $props();

  const subjectCap = $derived(isYou ? 'You' : displayName);
  const subject = $derived(isYou ? 'you' : displayName);
  const possessive = $derived(isYou ? 'Your' : `${displayName}'s`);

  // Career-rating chip (#738), season scope only. Rendered ONLY for a qualified player: below the
  // gate the honest state is silence, not a provisional number (ADR-0032 §5) — and unlike the
  // Career hero, this surface has no room to explain a "N to go" progress, so it withholds rather
  // than narrating a gate on a page the player didn't come to for their rating.
  const chipValue = $derived(careerRating?.entry?.rating ?? null);
  const chipTier = $derived(chipValue != null ? ratingTier(chipValue) : null);
  const chipRank = $derived(careerRating?.rank ?? null);
  // Spelled out for assistive tech, where the visual grouping that separates this boxed chip from
  // the season tiles above it does not exist: the words carry the grain instead (ADR-0032 §9 —
  // the rating is a cross-season market number and must never read as a season stat).
  const chipLabel = $derived(
    chipValue == null || chipTier == null
      ? ''
      : `Career rating ${chipValue}, ${tierLabel(chipTier)}` +
          (chipRank == null ? '' : `, ranked #${chipRank} in the league`) +
          ' — career-long across every season, not this season. Open the credibility ladder.'
  );
</script>

<Card data-testid="stats-hero">
  <CardHeader>
    <div class="flex items-center justify-between gap-3">
      <CardTitle class="text-2xl">{subjectCap}</CardTitle>
      <span class="shrink-0 font-mono text-xs text-muted-foreground">{scopeLabel}</span>
    </div>
    <CardDescription
      >How {subject} play the board — the numbers and the tells behind them.</CardDescription
    >
  </CardHeader>
  <CardContent class="space-y-5">
    <!-- The credibility rating leads the Career hero (#361, ADR-0032): the one cross-season number,
         with Record / ATS% / Decisions demoted to the supporting receipts below it. Career scope
         only — the page omits this prop at season scope. -->
    {#if rating}
      <RatingBand entry={rating.entry} rank={rating.rank} />
    {/if}

    <!-- Analytics only: standings score + rank live on the Leaderboard (ADR-0018). These tiles
         describe actual performance against the spread, always raw. -->
    <dl class="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <div>
        <dt class="text-xs font-medium text-muted-foreground">Record (W-L-P)</dt>
        <dd class="text-2xl font-bold tabular-nums">{wins}-{losses}-{pushes}</dd>
        {#if missed > 0}
          <p class="text-xs text-muted-foreground">{missed} missed</p>
        {/if}
      </div>
      <div>
        <dt class="text-xs font-medium text-muted-foreground">ATS accuracy</dt>
        <dd class="text-2xl font-bold">{formatAccuracy(atsAccuracy)}</dd>
      </div>
      <div>
        <dt class="text-xs font-medium text-muted-foreground">Decisions</dt>
        <dd class="text-2xl font-bold">{decisions}</dd>
      </div>
    </dl>

    <!-- The career rating on the SEASON hero (#738), as a chip rather than the band: the mirror
         image of the Career hero above, where it leads. Here the season is the headline and the
         rating is the durable footnote under it — but it is present, which it never was before,
         so the rating is default-visible in every month instead of only whichever one the
         calendar happened to flip the page to. Its own bordered, explicitly-labelled box, so it
         reads as a different KIND of number from the season tiles it sits under (ADR-0032 §9's
         non-conflation, applied to season-vs-career rather than rating-vs-standings).

         The link is the point of the "#N" too: that rank is a comparison fact on an analytics
         page (an ADR-0018 carve-out RatingBand carries as a bare line), and turning it into the
         way to the ladder makes it a cross-reference to the surface that owns comparison rather
         than a standings fact stranded here. `view=standings` is explicit because a bare
         /league opens the Week tab during a live window (#584) — the ladder lives in the
         Standings panel, so the link has to name it or the cross-reference misses exactly when
         the app is busiest. -->
    {#if chipValue != null}
      <a
        href="/league?view=standings&scope=alltime"
        data-testid="career-rating-chip"
        aria-label={chipLabel}
        class="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border bg-muted/30 px-3 py-2 transition-colors hover:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <span class="text-eyebrow text-muted-foreground">Career rating</span>
        <span class="text-sm font-semibold tabular-nums" data-testid="career-rating-chip-value"
          >{chipValue}</span
        >
        <RatingTierPill tier={chipTier} />
        <span class="ml-auto flex items-center gap-1 font-mono text-xs text-muted-foreground">
          {#if chipRank != null}#{chipRank}{/if}
          <ArrowRight class="size-3.5" aria-hidden="true" />
        </span>
      </a>
    {/if}

    <div class="border-t pt-4">
      <p class="mb-2.5 text-xs font-medium text-muted-foreground">{possessive} signature</p>
      <SignatureTells {tells} {isYou} {displayName} />
    </div>
  </CardContent>
</Card>

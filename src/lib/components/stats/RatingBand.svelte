<script lang="ts">
  // Cross-season credibility rating band (issue #361, ADR-0032). Leads the Career scope of the
  // StatsHero: the one number that survives the season reset. Two states — a rated player (number +
  // tier word + season-delta arrow + meter) and Unrated (hidden until qualified, ADR-0032 §5), shown
  // as an explicit "N to go" progress, never a provisional number. Career-only: the season scope
  // never renders this (a single season's reset-and-regress rating isn't a stable story).
  //
  // Pure presentation over already-derived values. All colour comes from semantic tokens so the band
  // reads correctly under both themes (ADR-0027/0029) — no raw hex or Tailwind scale.
  import {
    RATING_PAR,
    MIN_QUALIFIED_DECISIONS,
    meterPct,
    ratingTier,
    type PlayerRatingEntry,
    type RatingTier
  } from '$lib/domain/rating';
  import RatingTierPill from '$lib/components/RatingTierPill.svelte';

  let {
    entry,
    rank
  }: {
    /** The selected player's rating row, or undefined when they have no row yet (Unrated, 0 done). */
    entry: PlayerRatingEntry | undefined;
    /** In-group rank among qualified players, or null while Unrated. */
    rank: number | null;
  } = $props();

  const rating = $derived(entry?.rating ?? null);
  const rated = $derived(rating != null);
  const decisions = $derived(entry?.decisions ?? 0);
  const toQualify = $derived(entry?.decisionsToQualify ?? MIN_QUALIFIED_DECISIONS - decisions);
  const seasonDelta = $derived(entry?.seasonDelta ?? null);

  const tier = $derived<RatingTier | null>(rating != null ? ratingTier(rating) : null);
  const fillPct = $derived(
    rating != null ? meterPct(rating) : (decisions / MIN_QUALIFIED_DECISIONS) * 100
  );
  const isHotshot = $derived(tier === 'hotshot');
  // Same background-size trick as CoverMeter's `hot` variant (#704): the gradient's own 0–100%
  // coordinate is stretched to the track's full width, not the fill span's, so its 50% stop always
  // lands on the par tick regardless of how wide the fill is.
  const meterHot = $derived(isHotshot && fillPct > 50);
  const meterFillStyle = $derived(
    `width: ${Math.max(0, Math.min(100, fillPct))}%;` +
      (meterHot
        ? ` background-image: linear-gradient(to right, var(--primary) 0%, var(--primary) 50%, var(--ember) 100%); background-size: ${(10000 / fillPct).toFixed(2)}% 100%;`
        : '')
  );
</script>

<div
  data-testid="rating-band"
  class="rounded-xl border p-4 {isHotshot
    ? 'border-ember/50 bg-ember/5 shadow-[0_10px_28px_-18px_var(--ember)]'
    : rated
      ? 'border-primary-ink/40 bg-primary/5'
      : 'border-dashed border-border bg-muted/30'}"
>
  <div class="flex items-center justify-between gap-3">
    <span class="text-eyebrow {rated ? 'text-primary-ink' : 'text-muted-foreground'}"
      >Market credibility</span
    >
    <RatingTierPill tier={rated ? tier : null} testid="rating-tier" />
  </div>

  {#if rated && rating != null}
    <div class="mt-1.5 flex items-baseline gap-2">
      <span
        class="text-stat tabular-nums {isHotshot ? 'text-ember' : ''}"
        data-testid="rating-value">{rating}</span
      >
      {#if seasonDelta != null && seasonDelta !== 0}
        <span
          class="text-sm font-semibold tabular-nums {seasonDelta > 0
            ? 'text-success'
            : 'text-destructive'}"
          data-testid="rating-delta"
        >
          {seasonDelta > 0 ? '▲' : '▼'}{Math.abs(seasonDelta)}
        </span>
      {:else}
        <span class="text-sm text-muted-foreground">▲0</span>
      {/if}
      {#if rank != null}
        <span class="ml-auto font-mono text-xs text-muted-foreground">#{rank} in league</span>
      {/if}
    </div>
  {:else}
    <div class="mt-1.5 flex items-baseline gap-2">
      <span class="text-stat text-muted-foreground">—</span>
      <span class="text-sm text-muted-foreground">{toQualify} more to qualify</span>
    </div>
  {/if}

  <!-- Meter: par sits at the midpoint for a rated player; for Unrated it fills toward the gate. -->
  <div class="relative mt-2 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
    <div
      class="absolute inset-y-0 left-0 rounded-full {rated
        ? meterHot
          ? ''
          : 'bg-primary'
        : 'bg-muted-foreground'}"
      style={meterFillStyle}
    ></div>
    {#if rated}
      <div class="absolute inset-y-0 left-1/2 w-px bg-foreground/30"></div>
    {/if}
  </div>

  <p class="mt-1.5 text-xs text-muted-foreground">
    {#if rated}
      {RATING_PAR} = market par · carries across seasons
    {:else}
      {decisions} / {MIN_QUALIFIED_DECISIONS} settled decisions · a rating unlocks at {MIN_QUALIFIED_DECISIONS}
    {/if}
  </p>
</div>

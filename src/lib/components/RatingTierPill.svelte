<script lang="ts">
  // The credibility tier chip (#361, ADR-0032) — "Hotshot" / "Sharp" / "Solid" / "Square", or
  // "Unrated" before the qualification gate. Extracted from RatingBand when the /league All-time
  // ladder (#637) became a second surface for the same verdict: the tier's loudness ladder is the
  // vocabulary, so it lives in one place rather than being hand-copied per surface.
  //
  // Loudness mirrors the tiers: Hotshot (the namesake apex) earns the brass fill plus an ink ring
  // so winning the top tier stands apart; Sharp the plain brass fill; Solid a quiet raised chip;
  // Square a plain outline; Unrated a dashed outline, to read as "not yet a verdict". All colour is
  // semantic tokens so it reads correctly under both themes (ADR-0027/0029) — no raw hex.
  import { tierLabel, type RatingTier } from '$lib/domain/rating';

  let {
    tier,
    testid,
    class: className = ''
  }: {
    /** The player's tier, or null for the Unrated (pre-gate) state. */
    tier: RatingTier | null;
    /** Optional test anchor. Left unset on surfaces that render many pills (the ladder), where the
     *  row is the anchor and a repeated testid would only be ambiguous. */
    testid?: string;
    class?: string;
  } = $props();

  function tierClass(t: RatingTier | null): string {
    if (t === 'hotshot') return 'bg-primary text-primary-foreground ring-2 ring-primary-ink/50';
    if (t === 'sharp') return 'bg-primary text-primary-foreground';
    if (t === 'solid') return 'border border-border bg-muted text-foreground';
    if (t === 'square') return 'border border-border text-muted-foreground';
    return 'border border-dashed border-border text-muted-foreground';
  }
</script>

<span
  class="rounded-full px-2 py-0.5 text-eyebrow whitespace-nowrap {tierClass(tier)} {className}"
  data-testid={testid}
>
  {tier == null ? 'Unrated' : `${tier === 'hotshot' ? '★ ' : ''}${tierLabel(tier)}`}
</span>

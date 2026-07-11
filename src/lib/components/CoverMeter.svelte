<script lang="ts">
  // Shared cover-% meter (issue #517): a horizontal bar filled to `pct` with a 50% baseline
  // tick, so "is this above or below a coin flip" reads pre-attentively from the shape before
  // the number — and never clips off a 390px screen the way a right-aligned table cell does.
  // Built once here for the /league situational panels; reused by the /stats controls + density
  // pass (#518). Kept presentational and null-safe: the caller derives the cover fraction (via
  // the shared `coverPct` helper) and usually renders the exact figure alongside, so the bar is
  // decorative by default (`aria-hidden`); pass `label` to make it a standalone labelled image.

  let {
    pct,
    label,
    class: className = ''
  }: {
    /** Cover fraction in [0, 1], or null for a no-decision split (renders an empty track). */
    pct: number | null;
    /** When set, the bar is an accessible standalone image with this label; otherwise decorative. */
    label?: string;
    class?: string;
  } = $props();

  // Clamp defensively so a stray >1 or <0 can never overflow the track.
  const width = $derived(pct == null ? 0 : Math.max(0, Math.min(1, pct)) * 100);
</script>

<div
  class="relative h-2 w-full overflow-hidden rounded-full bg-foreground/10 {className}"
  role={label ? 'img' : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : 'true'}
>
  {#if pct != null}
    <span
      class="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-ember to-primary"
      style="width: {width}%"
    ></span>
  {/if}
  <!-- 50% reference tick, drawn above the fill so it stays visible at any width. -->
  <span class="absolute inset-y-[-2px] left-1/2 w-px -translate-x-1/2 bg-foreground/40"></span>
</div>

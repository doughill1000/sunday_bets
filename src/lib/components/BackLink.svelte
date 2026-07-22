<script lang="ts">
  // The way out of a CTA-reached page (DESIGN.md principle 8 — "preserve context through
  // every transition": a screen the nav never links to must say how to get back).
  //
  // Extracted per the guide's second-consumer rule: `/recap`, `/demo/recap`, and
  // `/league/manage` each hand-rolled the same `← League` anchor, and Season Wrapped —
  // equally nav-less — had simply never grown one (#743). One import so the four cannot
  // drift, and so the affordance is a real 44px tap target with a focus ring rather than a
  // bare arrow glyph in a run of text.
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';

  let {
    href,
    label,
    testId = undefined
  }: {
    href: string;
    /** Where the link goes, named as a destination — "League", not "Back". */
    label: string;
    /** Stable e2e anchor; omitted where no spec addresses the link. */
    testId?: string;
  } = $props();
</script>

<!-- `-ml-2` pulls the padded hit area back to the content's optical left edge, so the arrow
     lines up with the heading beneath it while the tap target still clears 44px. -->
<a
  {href}
  data-testid={testId}
  class="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
>
  <ArrowLeft class="size-4 shrink-0" aria-hidden="true" />
  <span>{label}</span>
</a>

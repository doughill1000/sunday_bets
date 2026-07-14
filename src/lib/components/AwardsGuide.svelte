<script lang="ts">
  import { MediaQuery } from 'svelte/reactivity';
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
  } from '$lib/components/ui/dialog';
  import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription
  } from '$lib/components/ui/sheet';
  import { Button } from '$lib/components/ui/button';
  import { BADGE_GLOSSARY, BADGE_AXES, AXIS_BADGE_IDS } from '$lib/domain/badges';
  import Info from '@lucide/svelte/icons/info';

  const byId = new Map(BADGE_GLOSSARY.map((g) => [g.id, g]));

  // Paired awards explain themselves only as a pair: one measure, two ends, a zero between
  // them where nobody is awarded (#635). Listing the faces separately in the flat title
  // list would hide the fact that landing in the middle is a legitimate, common outcome.
  const axes = BADGE_AXES.map((axis) => ({
    measure: axis.measure,
    zeroLabel: axis.zeroLabel,
    faces: axis.ends.map((e) => byId.get(e.id)).filter((g) => g !== undefined)
  })).filter((a) => a.faces.length === 2);

  const glossaryTitles = BADGE_GLOSSARY.filter(
    (g) => g.kind === 'title' && !AXIS_BADGE_IDS.has(g.id)
  );
  const glossaryMilestones = BADGE_GLOSSARY.filter((g) => g.kind === 'milestone');

  // Awards guide opens as a centered dialog on desktop, a bottom sheet on mobile
  // (matches WelcomeGuide). Controlled so one trigger drives whichever is mounted.
  const isDesktop = new MediaQuery('(min-width: 640px)');
  let guideOpen = $state(false);
</script>

{#snippet awardsGuideBody()}
  <div class="space-y-4">
    {#if axes.length > 0}
      <div class="space-y-2" data-testid="awards-guide-axes">
        <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Paired titles — earned at either end, or by nobody
        </p>
        <ul class="space-y-3">
          {#each axes as axis (axis.measure)}
            <li class="space-y-1.5 rounded-lg border bg-muted/30 p-3">
              <p class="text-sm font-medium">{axis.measure}</p>
              {#each axis.faces as face, i (face.id)}
                <div class="flex gap-2 text-sm">
                  <span class="shrink-0" aria-hidden="true">{face.emoji}</span>
                  <span>
                    <span class="font-medium">{face.label}</span>
                    <span class="text-muted-foreground"> — {face.description}</span>
                  </span>
                </div>
                <!-- The zero sits literally between the two faces: the dead zone is the
                     point of the whole row, not a footnote under it. -->
                {#if i === 0}
                  <p class="pl-6 text-xs italic text-muted-foreground">
                    {axis.zeroLabel} — no award
                  </p>
                {/if}
              {/each}
            </li>
          {/each}
        </ul>
      </div>
    {/if}
    <div class="space-y-2">
      <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Titles — one holder per season
      </p>
      <ul class="space-y-2">
        {#each glossaryTitles as g (g.id)}
          <li class="flex gap-2 text-sm">
            <span class="shrink-0" aria-hidden="true">{g.emoji}</span>
            <span>
              <span class="font-medium">{g.label}</span>
              <span class="text-muted-foreground"> — {g.description}</span>
            </span>
          </li>
        {/each}
      </ul>
    </div>
    <div class="space-y-2">
      <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Milestones — anyone who hits the mark
      </p>
      <ul class="space-y-2">
        {#each glossaryMilestones as g (g.id)}
          <li class="flex gap-2 text-sm">
            <span class="shrink-0" aria-hidden="true">{g.emoji}</span>
            <span>
              <span class="font-medium">{g.label}</span>
              <span class="text-muted-foreground"> — {g.description}</span>
            </span>
          </li>
        {/each}
      </ul>
    </div>
  </div>
{/snippet}

<Button
  variant="link"
  size="sm"
  class="h-auto gap-1 p-0 text-xs"
  onclick={() => (guideOpen = true)}
>
  <Info class="size-3.5" aria-hidden="true" />
  Awards legend
</Button>

<!-- Awards guide: dialog on desktop, bottom sheet on mobile (matches WelcomeGuide). -->
{#if isDesktop.current}
  <Dialog bind:open={guideOpen}>
    <DialogContent data-testid="awards-guide" class="max-h-[80vh] max-w-lg overflow-y-auto px-8">
      <DialogHeader>
        <DialogTitle>Awards legend</DialogTitle>
        <DialogDescription>
          What each award means and how it's earned. Updates as games are graded.
        </DialogDescription>
      </DialogHeader>
      {@render awardsGuideBody()}
    </DialogContent>
  </Dialog>
{:else}
  <Sheet bind:open={guideOpen}>
    <SheetContent
      data-testid="awards-guide"
      side="bottom"
      class="max-h-[85vh] overflow-y-auto rounded-t-xl pb-8"
    >
      <SheetHeader class="pb-2">
        <SheetTitle>Awards legend</SheetTitle>
        <SheetDescription>
          What each award means and how it's earned. Updates as games are graded.
        </SheetDescription>
      </SheetHeader>
      <div class="px-4">
        {@render awardsGuideBody()}
      </div>
    </SheetContent>
  </Sheet>
{/if}

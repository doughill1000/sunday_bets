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
  import {
    WEEKLY_AWARD_FLAVORS,
    WEEKLY_AWARD_ORDER,
    type WeeklyAwardId
  } from '$lib/domain/weeklyAwards';
  import Info from '@lucide/svelte/icons/info';

  // Two legends, one component (#780). Each surface mounts only the tier it actually shows: the
  // Honors tab and Season Wrapped explain the curated season awards (`scope="season"`), the Week
  // tab and the recap archive explain weekly hardware (`scope="weekly"`). Splitting the single
  // combined guide this way means a legend never describes jewellery that isn't on the screen
  // beside it — the Week tab used to open a legend that led with season titles it never renders.
  let { scope }: { scope: 'season' | 'weekly' } = $props();

  const COPY = {
    season: {
      trigger: 'Awards legend',
      title: 'Awards legend',
      description: "What each season award means and how it's earned. Updates as games are graded."
    },
    weekly: {
      trigger: 'Hardware legend',
      title: 'Weekly hardware',
      description:
        "What each piece of weekly hardware means and how it's earned. Updates as games are graded."
    }
  } as const;
  const copy = $derived(COPY[scope]);

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

  // Weekly hardware is a separate tier from the season titles, and the legend says so with its
  // shape (#771) — two regions, never one merged list, per ADR-0035's boundary rule. Reading
  // WEEKLY_AWARD_FLAVORS directly means the legend cannot drift from the tiles.
  //
  // One flat list since #866 retired the Bad Beat / Backdoor pair (see the markup below).
  const weeklyEntry = (id: WeeklyAwardId) => ({ id, ...WEEKLY_AWARD_FLAVORS[id] });
  const weeklySolo = WEEKLY_AWARD_ORDER.map(weeklyEntry);

  // Awards guide opens as a centered dialog on desktop, a bottom sheet on mobile
  // (matches WelcomeGuide). Controlled so one trigger drives whichever is mounted.
  const isDesktop = new MediaQuery('(min-width: 640px)');
  let guideOpen = $state(false);
</script>

{#snippet awardsGuideBody()}
  <!-- Only one region renders per scope (#780), so there is no wrapping stack div — the Dialog /
       Sheet body owns the single section directly. -->
  {#if scope === 'season'}
    <!-- Region 1: the curated season titles, exactly as they have always rendered. -->
    <section class="space-y-4" data-testid="awards-guide-season">
      <div>
        <p class="text-sm font-semibold">Season titles</p>
        <p class="text-xs text-muted-foreground">
          The curated ones — held for a whole season, settled when it's crowned.
        </p>
      </div>
      {#if axes.length > 0}
        <div class="space-y-2" data-testid="awards-guide-axes">
          <p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
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
                    <p class="pl-6 text-xs text-muted-foreground italic">
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
        <p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
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
        <p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
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
    </section>
  {/if}

  {#if scope === 'weekly'}
    <!-- Region 2: weekly hardware. Rendered as its own standalone legend on the Week tab and the
         recap archive — the surfaces that actually show the hardware tiles. -->
    <section class="space-y-4" data-testid="awards-guide-weekly">
      <div>
        <p class="text-sm font-semibold">Weekly hardware</p>
        <p class="text-xs text-muted-foreground">
          A separate tier — three pieces mint every graded week, then reset. They count for nothing
          in the standings.
        </p>
      </div>

      <!-- One flat list since #866: the "Cover margin" pair it replaced needed a dead-zone line
           to be legible, and both of its awards are gone. -->
      <div class="space-y-2" data-testid="awards-guide-weekly-solo">
        <ul class="space-y-2">
          {#each weeklySolo as a (a.id)}
            <li class="flex gap-2 text-sm">
              <span class="shrink-0" aria-hidden="true">{a.emoji}</span>
              <span>
                <span class="font-medium">{a.label}</span>
                <span class="text-muted-foreground"> — {a.description}</span>
              </span>
            </li>
          {/each}
        </ul>
      </div>
    </section>
  {/if}
{/snippet}

<Button
  variant="link"
  size="sm"
  class="h-auto gap-1 p-0 text-xs"
  onclick={() => (guideOpen = true)}
>
  <Info class="size-3.5" aria-hidden="true" />
  {copy.trigger}
</Button>

<!-- Awards guide: dialog on desktop, bottom sheet on mobile (matches WelcomeGuide). -->
{#if isDesktop.current}
  <Dialog bind:open={guideOpen}>
    <DialogContent data-testid="awards-guide" class="max-h-[80vh] max-w-lg overflow-y-auto px-8">
      <DialogHeader>
        <DialogTitle>{copy.title}</DialogTitle>
        <DialogDescription>
          {copy.description}
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
        <SheetTitle>{copy.title}</SheetTitle>
        <SheetDescription>
          {copy.description}
        </SheetDescription>
      </SheetHeader>
      <div class="px-4">
        {@render awardsGuideBody()}
      </div>
    </SheetContent>
  </Sheet>
{/if}

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
  import { BADGE_GLOSSARY } from '$lib/domain/badges';
  import Info from '@lucide/svelte/icons/info';

  const glossaryTitles = BADGE_GLOSSARY.filter((g) => g.kind === 'title');
  const glossaryMilestones = BADGE_GLOSSARY.filter((g) => g.kind === 'milestone');

  // Awards guide opens as a centered dialog on desktop, a bottom sheet on mobile
  // (matches WelcomeGuide). Controlled so one trigger drives whichever is mounted.
  const isDesktop = new MediaQuery('(min-width: 640px)');
  let guideOpen = $state(false);
</script>

{#snippet awardsGuideBody()}
  <div class="space-y-4">
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

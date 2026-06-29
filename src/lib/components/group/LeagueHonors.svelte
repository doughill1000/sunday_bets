<script lang="ts">
  import { MediaQuery } from 'svelte/reactivity';
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
  } from '$lib/components/ui/card';
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
  import UserAvatar from '$lib/components/UserAvatar.svelte';
  import SeasonPicker from '$lib/components/SeasonPicker.svelte';
  import { BADGE_GLOSSARY } from '$lib/domain/badges';
  import type { BadgeAward, LeagueHonors } from '$lib/types/honors';
  import Trophy from '@lucide/svelte/icons/trophy';
  import Info from '@lucide/svelte/icons/info';

  let {
    honors,
    badges = [],
    members = [],
    currentUserId = null,
    seasons = [],
    selectedSeason = null
  }: {
    honors: LeagueHonors;
    badges?: BadgeAward[];
    /** Group roster, used only to look up avatar keys for award holders. */
    members?: { userId: string; avatarKey: string | null }[];
    currentUserId?: string | null;
    seasons?: number[];
    selectedSeason?: number | null;
  } = $props();

  const reigning = $derived(honors.reigningChampion);
  const trophyCase = $derived(honors.trophyCase);
  // Hide the spoon for a one-player season, where the champion is also last place.
  const woodenSpoon = $derived(
    honors.woodenSpoon && honors.woodenSpoon.user_id !== reigning?.user_id
      ? honors.woodenSpoon
      : null
  );

  const hasBadgePicker = $derived(seasons.length > 1);

  // Season is "complete" once it appears in the trophy case (rank-1 entry exists).
  // In-season badges are provisional; they crown when the season finalises.
  const isSeasonComplete = $derived(
    selectedSeason != null && honors.trophyCase.some((c) => c.season_year === selectedSeason)
  );

  // Pivot awards to a member-first view: one row per holder, their awards collected.
  // Sorted by most-decorated first, then alphabetically for a stable order.
  type AwardHolder = { user_id: string; display_name: string; awards: BadgeAward[] };
  const awardHolders = $derived.by<AwardHolder[]>(() => {
    const byUser: Record<string, AwardHolder> = {};
    for (const badge of badges) {
      for (const h of badge.holders) {
        const entry = byUser[h.user_id];
        if (entry) {
          entry.awards.push(badge);
        } else {
          byUser[h.user_id] = {
            user_id: h.user_id,
            display_name: h.display_name,
            awards: [badge]
          };
        }
      }
    }
    return Object.values(byUser).sort(
      (a, b) => b.awards.length - a.awards.length || a.display_name.localeCompare(b.display_name)
    );
  });

  // userId → avatarKey lookup for award holders (holders carry no avatar of their own).
  const avatarByUser = $derived<Record<string, string | null>>(
    Object.fromEntries(members.map((m) => [m.userId, m.avatarKey]))
  );

  const glossaryTitles = BADGE_GLOSSARY.filter((g) => g.kind === 'title');
  const glossaryMilestones = BADGE_GLOSSARY.filter((g) => g.kind === 'milestone');

  // Awards guide opens as a centered dialog on desktop, a bottom sheet on mobile
  // (matches WelcomeGuide). Controlled so one trigger drives whichever is mounted.
  const isDesktop = new MediaQuery('(min-width: 640px)');
  let guideOpen = $state(false);

  function nameFor(userId: string, displayName: string): string {
    return userId === currentUserId ? `${displayName} (you)` : displayName;
  }
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

<!-- Render once there's a champion, awarded badges, or a season picker to show. -->
{#if reigning || badges.length > 0 || hasBadgePicker}
  <Card data-testid="league-honors">
    <CardHeader>
      <CardTitle>League honors</CardTitle>
      <CardDescription>Champions, the trophy case, the wooden spoon, and awards.</CardDescription>
    </CardHeader>
    <CardContent class="space-y-6">
      {#if reigning}
        <!-- Reigning champion -->
        <div class="flex items-center gap-3" data-testid="reigning-champion">
          <UserAvatar
            avatarKey={reigning.avatar_key}
            displayName={reigning.display_name}
            size="md"
            champion
          />
          <div>
            <p class="text-lg font-bold tracking-tight">
              {nameFor(reigning.user_id, reigning.display_name)}
            </p>
            <p class="text-sm text-muted-foreground">{reigning.season_year} champion</p>
          </div>
        </div>

        <!-- Trophy case: every completed season's champion, newest first -->
        <div class="space-y-2" data-testid="trophy-case">
          <p class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Trophy class="size-3.5 text-yellow-500" aria-hidden="true" />
            Trophy case
          </p>
          <ul class="flex flex-wrap gap-2">
            {#each trophyCase as champ (`${champ.season_year}-${champ.user_id}`)}
              <li
                class="flex items-center gap-2 rounded-full border bg-muted/40 py-1 pr-3 pl-1 text-sm"
              >
                <UserAvatar
                  avatarKey={champ.avatar_key}
                  displayName={champ.display_name}
                  size="xs"
                />
                <span class="font-medium tabular-nums text-muted-foreground"
                  >{champ.season_year}</span
                >
                <span>{nameFor(champ.user_id, champ.display_name)}</span>
              </li>
            {/each}
          </ul>
        </div>

        <!-- Wooden spoon: last place of the most-recently-completed season -->
        {#if woodenSpoon}
          <div
            class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
            data-testid="wooden-spoon"
          >
            <span aria-hidden="true">🥄</span>
            <UserAvatar
              avatarKey={woodenSpoon.avatar_key}
              displayName={woodenSpoon.display_name}
              size="xs"
            />
            <span
              >{nameFor(woodenSpoon.user_id, woodenSpoon.display_name)} — {woodenSpoon.season_year}
              wooden spoon</span
            >
          </div>
        {/if}
      {/if}

      <!-- Awards: per-season titles and milestones, grouped by member (#281). -->
      {#if badges.length > 0 || hasBadgePicker}
        <div class="space-y-3" data-testid="badge-chips">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-3">
              <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Awards
              </p>
              {#if hasBadgePicker && selectedSeason != null}
                <SeasonPicker {seasons} selected={selectedSeason} />
              {/if}
              <!-- Provisional/crowned lifecycle indicator (#296). -->
              {#if badges.length > 0}
                {#if isSeasonComplete}
                  <span
                    class="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:text-yellow-400"
                    data-testid="awards-crowned"
                  >
                    Crowned
                  </span>
                {:else}
                  <span
                    class="rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground"
                    data-testid="awards-provisional"
                  >
                    Provisional
                  </span>
                {/if}
              {/if}
            </div>
            <Button
              variant="link"
              size="sm"
              class="h-auto gap-1 p-0 text-xs"
              onclick={() => (guideOpen = true)}
            >
              <Info class="size-3.5" aria-hidden="true" />
              How awards work?
            </Button>
          </div>

          {#if badges.length > 0}
            <ul class="space-y-3">
              {#each awardHolders as member (member.user_id)}
                <li class="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
                  <div class="flex items-center gap-2 sm:w-32 sm:shrink-0">
                    <UserAvatar
                      avatarKey={avatarByUser[member.user_id] ?? null}
                      displayName={member.display_name}
                      size="xs"
                    />
                    <span class="truncate text-sm font-medium">
                      {nameFor(member.user_id, member.display_name)}
                    </span>
                  </div>
                  <ul class="flex flex-wrap gap-1.5">
                    {#each member.awards as badge (badge.id)}
                      <li
                        class="flex items-center gap-1.5 rounded-full border bg-muted/40 py-0.5 pr-2.5 pl-2 text-xs"
                        data-testid="badge-chip-{badge.id}"
                        title={badge.flavor}
                      >
                        <span aria-hidden="true">{badge.emoji}</span>
                        <span class="font-medium">{badge.label}</span>
                      </li>
                    {/each}
                  </ul>
                </li>
              {/each}
            </ul>
          {:else}
            <p class="text-sm text-muted-foreground">No badges awarded this season.</p>
          {/if}
        </div>
      {/if}
    </CardContent>
  </Card>

  <!-- Awards guide: dialog on desktop, bottom sheet on mobile (matches WelcomeGuide). -->
  {#if isDesktop.current}
    <Dialog bind:open={guideOpen}>
      <DialogContent data-testid="awards-guide" class="max-h-[80vh] max-w-lg overflow-y-auto px-8">
        <DialogHeader>
          <DialogTitle>Awards guide</DialogTitle>
          <DialogDescription>
            How each award is earned. Awards update as games are graded.
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
          <SheetTitle>Awards guide</SheetTitle>
          <SheetDescription>
            How each award is earned. Awards update as games are graded.
          </SheetDescription>
        </SheetHeader>
        <div class="px-4">
          {@render awardsGuideBody()}
        </div>
      </SheetContent>
    </Sheet>
  {/if}
{/if}

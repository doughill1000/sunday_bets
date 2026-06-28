<script lang="ts">
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
  } from '$lib/components/ui/card';
  import UserAvatar from '$lib/components/UserAvatar.svelte';
  import SeasonPicker from '$lib/components/SeasonPicker.svelte';
  import type { BadgeAward, LeagueHonors } from '$lib/types/honors';
  import Trophy from '@lucide/svelte/icons/trophy';

  let {
    honors,
    badges = [],
    currentUserId = null,
    seasons = [],
    selectedSeason = null
  }: {
    honors: LeagueHonors;
    badges?: BadgeAward[];
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

  function nameFor(userId: string, displayName: string): string {
    return userId === currentUserId ? `${displayName} (you)` : displayName;
  }
</script>

<!-- Render once there's a champion, awarded badges, or a season picker to show. -->
{#if reigning || badges.length > 0 || hasBadgePicker}
  <Card data-testid="league-honors">
    <CardHeader>
      <CardTitle>League honors</CardTitle>
      <CardDescription>Champions, the trophy case, and the wooden spoon.</CardDescription>
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
            {#each trophyCase as champ (champ.season_year)}
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
            class="flex items-center gap-2 text-sm text-muted-foreground"
            data-testid="wooden-spoon"
          >
            <span aria-hidden="true">🥄</span>
            <UserAvatar
              avatarKey={woodenSpoon.avatar_key}
              displayName={woodenSpoon.display_name}
              size="xs"
            />
            <span>{nameFor(woodenSpoon.user_id, woodenSpoon.display_name)}</span>
            <span>— {woodenSpoon.season_year} wooden spoon</span>
          </div>
        {/if}
      {/if}

      <!-- Identity badges: per-season titles and milestones (#281) -->
      {#if badges.length > 0 || hasBadgePicker}
        <div class="space-y-2" data-testid="badge-chips">
          <div class="flex flex-wrap items-center gap-3">
            <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Identity badges
            </p>
            {#if hasBadgePicker && selectedSeason != null}
              <SeasonPicker {seasons} selected={selectedSeason} />
            {/if}
          </div>
          {#if badges.length > 0}
            <ul class="flex flex-wrap gap-2">
              {#each badges as badge (badge.id)}
                <li
                  class="flex items-center gap-1.5 rounded-full border bg-muted/40 py-1 pr-3 pl-2.5 text-sm"
                  data-testid="badge-chip-{badge.id}"
                  title={badge.flavor}
                >
                  <span aria-hidden="true">{badge.emoji}</span>
                  <span class="font-medium">{badge.label}</span>
                  <span class="text-muted-foreground">—</span>
                  <span
                    >{badge.holders.map((h) => nameFor(h.user_id, h.display_name)).join(', ')}</span
                  >
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
{/if}

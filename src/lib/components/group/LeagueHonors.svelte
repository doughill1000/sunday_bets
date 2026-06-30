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
  import AwardsGuide from '$lib/components/AwardsGuide.svelte';
  import type { BadgeAward, LeagueHonors } from '$lib/types/honors';
  import Trophy from '@lucide/svelte/icons/trophy';
  import Gift from '@lucide/svelte/icons/gift';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';

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

  function nameFor(userId: string, displayName: string): string {
    return userId === currentUserId ? `${displayName} (you)` : displayName;
  }
</script>

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
            <AwardsGuide />
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

      <!-- Season Wrapped entry point. A reigning champion implies at least one finalised
           season, which is exactly when a Wrapped exists — the seasonal moment lives here
           and on the Leaderboard CTA rather than in a permanent nav tab. -->
      {#if reigning}
        <a
          href="/wrapped"
          data-testid="wrapped-honors-link"
          class="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-primary/10"
        >
          <Gift class="size-4 shrink-0 text-primary" aria-hidden="true" />
          <span class="flex-1">See the full Season Wrapped</span>
          <ArrowRight class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </a>
      {/if}
    </CardContent>
  </Card>
{/if}

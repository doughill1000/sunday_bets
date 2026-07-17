<script lang="ts">
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
  } from '$lib/components/ui/card';
  import UserAvatar from '$lib/components/UserAvatar.svelte';
  import AwardsGuide from '$lib/components/AwardsGuide.svelte';
  import { BADGE_AXES, AXIS_BADGE_IDS, BADGE_GLOSSARY } from '$lib/domain/badges';
  import type { BadgeAward, LeagueHonors } from '$lib/types/honors';
  import Trophy from '@lucide/svelte/icons/trophy';
  import Gift from '@lucide/svelte/icons/gift';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';

  let {
    honors,
    badges = [],
    members = [],
    currentUserId = null,
    selectedSeason = null,
    wrappedHref = '/wrapped',
    recapsHref = '/recap'
  }: {
    honors: LeagueHonors;
    badges?: BadgeAward[];
    /** Group roster, used only to look up avatar keys for award holders. */
    members?: { userId: string; avatarKey: string | null }[];
    currentUserId?: string | null;
    /** The season honors describe. Set by whichever surface owns the season control —
     *  honors no longer carries a picker of its own (#631). */
    selectedSeason?: number | null;
    /** Where the "See the full Season Wrapped" link points; overridden by the public demo. */
    wrappedHref?: string;
    /** Where the "Season recaps" CTA points, or null to omit it — the demo's nav already
     *  features its own Recap tab, so it passes null rather than doubling the door (#631). */
    recapsHref?: string | null;
  } = $props();

  const reigning = $derived(honors.reigningChampion);
  const trophyCase = $derived(honors.trophyCase);
  // Hide the spoon for a one-player season, where the champion is also last place.
  const woodenSpoon = $derived(
    honors.woodenSpoon && honors.woodenSpoon.user_id !== reigning?.user_id
      ? honors.woodenSpoon
      : null
  );

  // Season is "complete" once it appears in the trophy case (rank-1 entry exists).
  // In-season badges are provisional; they crown when the season finalises.
  const isSeasonComplete = $derived(
    selectedSeason != null && honors.trophyCase.some((c) => c.season_year === selectedSeason)
  );

  // Render only awards the legend can explain. A badge with no glossary entry is one the
  // engine can no longer award — today that's the dark crowd-lean pair (#635), which can
  // still reach this component from a frozen fixture such as the demo snapshot, generated
  // before the axis landed. A chip the legend can't explain is exactly the unearnable
  // jewellery this card exists to stop showing, so drop it rather than display an award
  // nobody could win. Regenerating the snapshot makes this a no-op, and is the real fix —
  // this guard just means a stale fixture degrades quietly instead of lying.
  const explainable = new Set(BADGE_GLOSSARY.map((g) => g.id));
  const shown = $derived(badges.filter((b) => explainable.has(b.id)));

  // Pivot awards axis-major (#635), inverting the player-major pivot #631 landed. The
  // award is now the row and the avatar sits inside it, because an axis is a claim about
  // a measure ("who's out on the ends of line lean") that a per-player list can't make —
  // it scattered the two faces of one pair across two rows and never showed that an end
  // went unclaimed. Consequence, by design: a player holding two badges appears twice.
  const byId = $derived(new Map(shown.map((b) => [b.id, b])));

  // One group per axis, carrying only the ends someone actually earned. An axis nobody
  // earned yields no group at all and renders nothing — absence costs zero lines.
  type AxisGroup = { measure: string; awards: BadgeAward[]; unclaimed: string | null };
  const axisGroups = $derived.by<AxisGroup[]>(() =>
    BADGE_AXES.map((axis) => {
      const earned = axis.ends.map((e) => byId.get(e.id)).filter((b) => b !== undefined);
      // With one end earned, name the empty one — "Chalk end unclaimed" is the honest
      // headline the old card couldn't say. With both or neither, there's nothing to note.
      const missing = earned.length === 1 ? axis.ends.find((e) => !byId.has(e.id)) : undefined;
      return {
        measure: axis.measure,
        awards: earned,
        unclaimed: missing ? `${missing.name} end unclaimed` : null
      };
    }).filter((g) => g.awards.length > 0)
  );

  // Everything that isn't on an axis still needs a home: the plain titles and the
  // milestones, each keeping the member-first shape they read best in.
  const looseTitles = $derived(
    shown.filter((b) => b.kind === 'title' && !AXIS_BADGE_IDS.has(b.id))
  );
  const milestones = $derived(shown.filter((b) => b.kind === 'milestone'));

  // userId → avatarKey lookup for award holders (holders carry no avatar of their own).
  const avatarByUser = $derived<Record<string, string | null>>(
    Object.fromEntries(members.map((m) => [m.userId, m.avatarKey]))
  );

  function nameFor(userId: string, displayName: string): string {
    return userId === currentUserId ? `${displayName} (you)` : displayName;
  }
</script>

<!-- One row per award: the chip leads, its holder(s) follow. Wraps to a second line at
     390px rather than truncating the name, and a milestone with several holders lists them
     all inline. Shared by every group so an axis end, a plain title, and a milestone all
     read as the same kind of thing. -->
{#snippet awardRows(awards: BadgeAward[])}
  <ul class="space-y-1.5">
    {#each awards as badge (badge.id)}
      <li class="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span
          class="flex shrink-0 items-center gap-1.5 rounded-full border bg-muted/40 py-0.5 pr-2.5 pl-2 text-xs"
          data-testid="badge-chip-{badge.id}"
          title={badge.flavor}
        >
          <span aria-hidden="true">{badge.emoji}</span>
          <span class="font-medium">{badge.label}</span>
        </span>
        {#each badge.holders as h (h.user_id)}
          <span class="flex min-w-0 items-center gap-1.5">
            <UserAvatar
              avatarKey={avatarByUser[h.user_id] ?? null}
              displayName={h.display_name}
              size="xs"
            />
            <span class="truncate text-sm">{nameFor(h.user_id, h.display_name)}</span>
          </span>
        {/each}
      </li>
    {/each}
  </ul>
{/snippet}

<!-- Render once there's a completed season (trophy case) or awarded badges. A multi-season
     league is no longer a reason on its own: that only ever justified showing the awards
     SeasonPicker, which #631 deleted (honors now follows the season its host tab already
     selected). The reigning champion itself lives outside this card now, in the evergreen
     banner above the /league tabs (#727) — this card opens on the trophy case instead. -->
{#if trophyCase.length > 0 || shown.length > 0}
  <Card data-testid="league-honors">
    <CardHeader>
      <CardTitle>League honors</CardTitle>
      <CardDescription>The trophy case, the wooden spoon, and awards.</CardDescription>
    </CardHeader>
    <CardContent class="space-y-6">
      {#if trophyCase.length > 0}
        <!-- Trophy case: every completed season's champion, newest first -->
        <div class="space-y-2" data-testid="trophy-case">
          <p class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Trophy class="size-3.5 text-primary-ink" aria-hidden="true" />
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

      <!-- Awards: per-season titles and milestones, grouped by member (#281). Set off behind
           its own rule and a primary-ink label (#631) so the curated season titles read as a
           distinct tier from the champion chips above rather than more of the same jewellery.
           The high-volume weekly-hardware shelf deliberately lives on the Season recaps
           archive below, never beside these. -->
      <div class="space-y-3 border-t pt-5" data-testid="badge-chips">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-primary-ink">Awards</p>
            <!-- Provisional/crowned lifecycle indicator (#296). -->
            {#if shown.length > 0}
              {#if isSeasonComplete}
                <span
                  class="rounded-full border border-primary-ink/40 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary-ink"
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

        {#if shown.length > 0}
          <div class="space-y-4">
            {#each axisGroups as group (group.measure)}
              <div class="space-y-2" data-testid="axis-group-{group.measure.replace(/\s+/g, '-')}">
                <p class="text-xs font-medium text-muted-foreground">
                  {group.measure}{#if group.unclaimed}<span class="font-normal">
                      · {group.unclaimed}</span
                    >{/if}
                </p>
                {@render awardRows(group.awards)}
              </div>
            {/each}

            {#if looseTitles.length > 0}
              <div class="space-y-2 border-t pt-4" data-testid="awards-titles">
                <p class="text-xs font-medium text-muted-foreground">Titles</p>
                {@render awardRows(looseTitles)}
              </div>
            {/if}

            {#if milestones.length > 0}
              <div class="space-y-2 border-t pt-4" data-testid="awards-milestones">
                <p class="text-xs font-medium text-muted-foreground">Milestones</p>
                {@render awardRows(milestones)}
              </div>
            {/if}
          </div>
        {:else}
          <p class="text-sm text-muted-foreground">No badges awarded this season.</p>
        {/if}
      </div>

      <!-- The two durable doors out of honors. Season Wrapped is the once-a-season set piece;
           Season recaps is the week-by-week archive that also holds the trophy shelf (#631) —
           neither has a nav tab, so this card is where they stay reachable. -->
      <div class="space-y-2">
        {#if trophyCase.length > 0}
          <!-- A completed season in the trophy case implies at least one finalised season,
               which is exactly when a Wrapped exists. -->
          <a
            href={wrappedHref}
            data-testid="wrapped-honors-link"
            class="flex items-center gap-2 rounded-lg border border-primary-ink/30 bg-primary/5 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-primary/10"
          >
            <Gift class="size-4 shrink-0 text-primary-ink" aria-hidden="true" />
            <span class="flex-1">See the full Season Wrapped</span>
            <ArrowRight class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </a>
        {/if}

        {#if recapsHref}
          <a
            href={recapsHref}
            data-testid="recaps-honors-link"
            class="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Sparkles class="size-4 shrink-0 text-primary-ink" aria-hidden="true" />
            <span class="flex-1">
              Season recaps
              <span class="font-normal text-muted-foreground">· trophy shelf + weekly stories</span>
            </span>
            <ArrowRight class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </a>
        {/if}
      </div>
    </CardContent>
  </Card>
{/if}

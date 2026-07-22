<script lang="ts">
  // The Trophy Room's hero (#741): the viewed season's champion, or an honest
  // "not decided yet" zero-state while that season is still being played. Always renders —
  // the empty slot is a designed state that narrates the race (DESIGN.md P11, ADR-0035 §3),
  // never a blank. Replaces the evergreen ReigningChampionBanner's above-the-tabs slot;
  // the compact HonorsStrip is what points here now.
  import UserAvatar from '$lib/components/UserAvatar.svelte';
  import type { SeasonHonor } from '$lib/types/honors';
  import Crown from '@lucide/svelte/icons/crown';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';

  let {
    champion,
    isReigning = false,
    seasonYear,
    seasonInProgress,
    record = null,
    leaderLine = null,
    currentUserId = null,
    onStandings = null
  }: {
    /** The viewed season's trophy-case entry, or null while it has no champion. */
    champion: SeasonHonor | null;
    /** Ember is reserved for the reigning crown (DESIGN.md P13); a past season's
     *  champion renders in the quiet gold identity treatment instead. */
    isReigning?: boolean;
    seasonYear: number;
    /** Drives the zero-state copy: an in-progress season is "not decided yet", a
     *  concluded one without a rank-1 row simply has no champion recorded. */
    seasonInProgress: boolean;
    /** W-L-P of the champion's season, when the viewed standings carry it. */
    record?: string | null;
    /** Zero-state context ("Nate leads through Week 6"), when standings exist. */
    leaderLine?: string | null;
    currentUserId?: string | null;
    /** Zero-state jump to the live standings — the race the empty slot narrates. */
    onStandings?: (() => void) | null;
  } = $props();

  const name = $derived(
    champion && champion.user_id === currentUserId
      ? `${champion.display_name} (you)`
      : (champion?.display_name ?? '')
  );

  // Ember carries the border/wash only; the label text stays primary-ink/foreground so
  // AA holds in the light Parchment theme without minting an ember-ink token (P12).
  const CROWNED_REIGNING =
    'border-ember/50 bg-gradient-to-br from-ember/15 via-ember/5 to-transparent shadow-[0_12px_32px_-20px_var(--ember)]';
  const CROWNED_PAST =
    'border-primary-ink/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent';
</script>

{#if champion}
  <div
    class="flex items-center gap-3 rounded-xl border px-4 py-3.5 {isReigning
      ? CROWNED_REIGNING
      : CROWNED_PAST}"
    data-testid="champion-card"
  >
    <UserAvatar
      avatarKey={champion.avatar_key}
      displayName={champion.display_name}
      size="md"
      champion
    />
    <div class="min-w-0 flex-1 leading-tight">
      <p class="text-[0.65rem] font-bold tracking-wide text-primary-ink uppercase">
        {champion.season_year} Champion
      </p>
      <p class="truncate text-lg font-bold tracking-tight" data-testid="champion-name">{name}</p>
      <p class="text-xs text-muted-foreground tabular-nums">
        {champion.total_points} pts{record ? ` · ${record}` : ''}
      </p>
    </div>
  </div>
{:else}
  <div
    class="rounded-xl border border-dashed px-4 py-3.5"
    data-testid="champion-card"
    data-state="undecided"
  >
    <p class="text-[0.65rem] font-bold tracking-wide text-muted-foreground uppercase">
      {seasonYear} Champion · not decided
    </p>
    <div class="mt-1.5 flex items-center gap-2.5">
      <Crown class="size-5 shrink-0 text-muted-foreground/50" aria-hidden="true" />
      <div class="min-w-0 leading-tight">
        <p class="text-sm font-semibold">
          {seasonInProgress ? 'Crowned when the final week grades' : 'No champion recorded'}
        </p>
        {#if seasonInProgress && (leaderLine || onStandings)}
          <p class="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            {#if leaderLine}<span>{leaderLine}</span>{/if}
            {#if onStandings}
              <button
                type="button"
                class="inline-flex items-center gap-0.5 font-medium text-primary-ink transition-colors hover:underline"
                onclick={onStandings}
                data-testid="champion-zero-standings"
              >
                Standings <ArrowRight class="size-3" aria-hidden="true" />
              </button>
            {/if}
          </p>
        {/if}
      </div>
    </div>
  </div>
{/if}

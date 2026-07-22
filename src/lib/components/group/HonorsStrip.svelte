<script lang="ts">
  // The one-line honors door (#741): the reigning champion's evergreen identity (#727),
  // compressed from the old ReigningChampionBanner and repointed — it now opens the Honors
  // tab instead of deep-linking to Wrapped (the Wrapped door lives inside the room). This
  // strip is the honors' one seasonal first-paint mechanism; Standings stays the default
  // tab, so the room is always exactly one tap away and never a computed flip. The host
  // hides it while the Honors tab is active — a door has no job inside the room.
  import UserAvatar from '$lib/components/UserAvatar.svelte';
  import type { SeasonHonor } from '$lib/types/honors';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';

  let {
    reigningChampion,
    currentUserId = null,
    onOpen
  }: {
    reigningChampion: SeasonHonor;
    currentUserId?: string | null;
    /** Opens the Honors tab — a client tab flip on the host page, so a callback, not a href. */
    onOpen: () => void;
  } = $props();

  const name = $derived(
    reigningChampion.user_id === currentUserId
      ? `${reigningChampion.display_name} (you)`
      : reigningChampion.display_name
  );
</script>

<!-- Gold = identity, per #727's banner; the ember moment lives on the ChampionCard inside
     the Honors tab, so this door stays quiet (DESIGN.md P13 restraint). -->
<button
  type="button"
  onclick={onOpen}
  data-testid="honors-strip"
  class="flex w-full items-center gap-2 rounded-lg border border-primary-ink/40 bg-gradient-to-r from-primary/10 to-transparent px-3 py-1.5 text-left transition-colors hover:from-primary/15"
>
  <UserAvatar
    avatarKey={reigningChampion.avatar_key}
    displayName={reigningChampion.display_name}
    size="xs"
    champion
  />
  <span class="min-w-0 truncate text-sm">
    <span class="font-bold">{name}</span>
    <span class="text-[0.65rem] font-bold tracking-wide text-primary-ink uppercase">
      · {reigningChampion.season_year} Champion
    </span>
  </span>
  <span class="ml-auto flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
    Honors <ArrowRight class="size-3.5" aria-hidden="true" />
  </span>
</button>

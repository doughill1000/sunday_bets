<script lang="ts">
  // Reigning-champion banner (#727): hoists the crown out of LeagueHonors — where it was
  // buried at the bottom of the Standings-season branch and absent from Week entirely — into
  // a slim, evergreen strip rendered above the /league tab group so it shows on both tabs.
  // Evergreen because `honors.reigningChampion` is season-independent (`getLeagueHonors`
  // takes no season; it always resolves the most-recently-completed season's rank-1), so this
  // never reacts to the Standings season dropdown.
  import UserAvatar from '$lib/components/UserAvatar.svelte';
  import type { SeasonHonor } from '$lib/types/honors';
  import Trophy from '@lucide/svelte/icons/trophy';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';

  let {
    reigningChampion,
    currentUserId = null,
    wrappedHref = '/wrapped'
  }: {
    reigningChampion: SeasonHonor;
    currentUserId?: string | null;
    wrappedHref?: string;
  } = $props();

  const name = $derived(
    reigningChampion.user_id === currentUserId
      ? `${reigningChampion.display_name} (you)`
      : reigningChampion.display_name
  );
</script>

<!-- Gold = identity (decided in #727, when this stacked under WrappedPromo's ember = action;
     #737 retired the promo, leaving this the one banner above the tabs). -->
<a
  href={wrappedHref}
  data-testid="reigning-champion-banner"
  class="flex w-full items-center gap-2.5 rounded-xl border border-primary-ink/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-3 py-2.5 transition-colors hover:from-primary/15"
>
  <UserAvatar
    avatarKey={reigningChampion.avatar_key}
    displayName={reigningChampion.display_name}
    size="md"
    champion
  />
  <div class="min-w-0 flex-1 leading-tight">
    <p class="truncate text-sm font-bold tracking-tight">
      {name}
    </p>
    <p class="text-[0.65rem] font-bold tracking-wide text-primary-ink uppercase">
      {reigningChampion.season_year} Champion
    </p>
  </div>
  <span class="flex shrink-0 items-center gap-1 text-muted-foreground">
    <Trophy class="size-4 text-primary-ink" aria-hidden="true" />
    <ArrowRight class="size-4" aria-hidden="true" />
  </span>
</a>

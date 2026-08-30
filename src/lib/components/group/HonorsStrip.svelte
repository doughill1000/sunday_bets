<script lang="ts">
  // The honors door (#741, made evergreen by #867): the one-line entrance to the trophy room,
  // rendered above `/league`'s two-tab toggle. It opens the Honors tab rather than deep-linking
  // to Wrapped (the Wrapped door lives inside the room), and the host hides it while the Honors
  // tab is active — a door has no job inside the room.
  //
  // #741 gated it on a reigning champion existing, which meant it was absent for the whole
  // in-season stretch and for every league that had never finished a season. It now takes a
  // discriminated state (`honorsDoor.ts`) and is **never absent**: the crown when the viewed
  // season has one, the freshest settled title while a season is in play, and a plain
  // "Trophy room →" when nothing has settled.
  //
  // #867 also thinned the gold. The door used to be a gold-bordered, gold-washed card sitting on
  // a page that already spends gold on the active tab, the awards label and the trophy-case
  // chips, so it read as more of the same rather than as the way in. It is a neutral card now
  // (`--border`, `--card`); gold survives on exactly two things — the crown on the champion's
  // avatar and the "· <year> Champion" label. Ember stays reserved for the crowned ChampionCard
  // inside the room (DESIGN.md P13), so the door stays quiet on purpose.
  import UserAvatar from '$lib/components/UserAvatar.svelte';
  import type { HonorsDoorState } from '$lib/ui/honorsDoor';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import Trophy from '@lucide/svelte/icons/trophy';

  let {
    state,
    currentUserId = null,
    newCount = 0,
    onOpen
  }: {
    /** What the door has to say about the viewed season — see `selectHonorsDoorState`. */
    state: HonorsDoorState;
    currentUserId?: string | null;
    /** Graded weeks of room content this device hasn't seen; 0 hides the pip (#867). */
    newCount?: number;
    /** Opens the Honors tab — a client tab flip on the host page, so a callback, not a href. */
    onOpen: () => void;
  } = $props();

  function nameFor(userId: string, displayName: string): string {
    return userId === currentUserId ? `${displayName} (you)` : displayName;
  }
</script>

<button
  type="button"
  onclick={onOpen}
  data-testid="honors-strip"
  data-door-state={state.kind}
  aria-label="Open the trophy room"
  class="flex w-full items-center gap-2.5 rounded-lg border bg-card px-3 py-2 text-left transition-colors hover:bg-muted/40"
>
  {#if state.kind === 'crowned'}
    <!-- The crown is one of the two things that stayed gold; the name is plain bold cream. -->
    <UserAvatar
      avatarKey={state.champion.avatar_key}
      displayName={state.champion.display_name}
      size="xs"
      champion
    />
    <span class="min-w-0 flex-1 truncate text-sm">
      <span class="font-bold text-foreground"
        >{nameFor(state.champion.user_id, state.champion.display_name)}</span
      >
      <span class="text-[0.65rem] font-bold tracking-wide text-primary-ink uppercase">
        · {state.champion.season_year} Champion
      </span>
    </span>
  {:else if state.kind === 'settled'}
    <!-- In-season: name the freshest thing that has settled. The award's own emoji is the
         glyph — no avatar, so a crowned door and a title door never read as the same shape. -->
    <span class="shrink-0 text-base leading-none" aria-hidden="true">{state.emoji}</span>
    <span class="min-w-0 flex-1 leading-tight">
      <span class="block truncate text-sm">
        <span class="font-bold text-foreground">{state.label}</span>
        <span class="text-muted-foreground">— {nameFor(state.holderUserId, state.holderName)}</span>
      </span>
      {#if state.throughWeek > 0}
        <span class="block truncate text-xs text-muted-foreground">
          Through Week {state.throughWeek}
        </span>
      {/if}
    </span>
  {:else}
    <!-- Nothing settled yet (a new league, or a season before its first grade). The door
         still opens; it just says where it goes. -->
    <Trophy class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    <span class="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">Trophy room</span>
  {/if}

  <span
    class="ml-auto flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground"
  >
    {#if newCount > 0}
      <!-- Brass, never ember: "there's something new" must not masquerade as the celebration
           itself (DESIGN.md P13). A count, not a bare dot, so the signal survives without
           colour (P16) and says how much is waiting.
           Brass INK, not a brass fill: the gold weight ladder (design-system.md, written down
           by #868) reserves the solid fill for actionable/primary and gives status the ink
           tier — and #868 had just demoted this very page's tab fill to stop the golds
           competing, so a new fill here would rebuild what it took down. -->
      <span
        data-testid="honors-new-pip"
        class="text-[0.7rem] font-bold text-primary-ink tabular-nums"
      >
        {newCount} new
      </span>
    {/if}
    {#if state.kind !== 'empty'}Honors{/if}
    <ArrowRight class="size-3.5" aria-hidden="true" />
  </span>
</button>

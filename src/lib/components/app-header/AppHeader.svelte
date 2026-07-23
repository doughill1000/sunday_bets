<script lang="ts">
  import type { User } from '@supabase/supabase-js';
  import { page, navigating } from '$app/state';
  import HeaderAccount from '$lib/components/app-header/HeaderAccount.svelte';
  import GroupSwitcher from '$lib/components/app-header/GroupSwitcher.svelte';
  import { openFeedback } from '$lib/feedback/store';

  // Five first-class tabs since #776 promoted Week out of /league (see BottomTabBar for the full
  // rationale): Week is the selected week's hardware + pick breakdown, second because it is the
  // highest-frequency surface; League is the standings + trophy-room home (with the commissioner
  // console at /league/manage); Market is the NFL-wide ATS surface (renamed from "Teams" so the tab
  // names the market concept and never collides with "League", the user's group). Wrapped is
  // intentionally absent: a seasonal moment surfaced via the League honors card link, not a
  // permanent nav destination. `weekLive` puts the red live-pulse dot on Week during the live
  // window — same signal as WeeklyLiveBoard's LIVE badge (one pattern per job).
  const navLinks = [
    { href: '/picks', label: 'Picks' },
    { href: '/week', label: 'Week' },
    { href: '/league', label: 'League' },
    { href: '/stats', label: 'Stats' },
    { href: '/market', label: 'Market' }
  ];

  interface Membership {
    groupId: string;
    groupName: string;
    role: string;
  }

  interface Props {
    user?: User | null;
    canSeeAdmin?: boolean;
    displayName?: string;
    avatarKey?: string | null;
    memberships?: Membership[];
    activeGroupId?: string | null;
    champion?: boolean;
    weekLive?: boolean;
  }

  let {
    user = null,
    canSeeAdmin = false,
    displayName = '',
    avatarKey = null,
    memberships = [],
    activeGroupId = null,
    champion = false,
    weekLive = false
  }: Props = $props();
</script>

<!-- Fills the h-14 container row provided by +layout.svelte -->
<div class="relative flex w-full items-center">
  <!-- Desktop inline nav (hidden on mobile — bottom tab bar takes over) -->
  <nav data-testid="primary-nav" class="hidden items-center gap-1 text-sm font-medium sm:flex">
    {#each navLinks as { href, label } (href)}
      {@const pendingPath = navigating?.to?.url.pathname ?? page.url.pathname}
      {@const active = pendingPath.startsWith(href)}
      <a
        {href}
        class="relative rounded-md px-3 py-1.5 transition-colors {active
          ? 'bg-accent font-semibold text-foreground'
          : 'hover:bg-accent'}"
        aria-current={active ? 'page' : undefined}
        >{label}{#if href === '/week' && weekLive}<span
            data-testid="week-live-dot"
            class="absolute top-1 right-1 size-1.5 animate-pulse rounded-full bg-destructive"
          ></span><span class="sr-only">— games live now</span>{/if}</a
      >
    {/each}
  </nav>

  <!-- Group name/switcher: plain text for single-group users, dropdown for multi-group
       (renders nothing with zero memberships). A single instance repositioned by
       breakpoint via auto-margins:
         mobile  — far-left slot (the desktop nav is hidden here, so the left is free,
                   and this keeps the multi-group chip from colliding with the centered
                   logo); `mr-auto` pushes the avatar to the far right.
         desktop — grouped on the right next to the avatar (`sm:ml-auto` + `sm:mr-2`). -->
  <div class="mr-auto sm:mr-2 sm:ml-auto">
    <GroupSwitcher {memberships} {activeGroupId} />
  </div>

  <!-- Centered logo (absolute so it doesn't push the nav) -->
  <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
    <a
      href="/"
      class="pointer-events-auto flex min-w-0 items-center font-semibold tracking-wide"
      aria-label="Hotshot home"
    >
      <!-- The mark's ink fills ~80% of its (now transparent) viewBox, so the box is
           sized to sit within the h-14 header row rather than overflow it — keeping
           the mark optically centered without dwarfing the surrounding chrome. -->
      <img
        src="/logo-mark.svg"
        alt="Hotshot logo"
        class="brand-chip h-12 w-12 shrink-0 md:h-14 md:w-14"
      />
    </a>
  </div>

  {#if user && __SHOW_BETA_TAG__}
    <!-- "Beta" is an invitation to report, not a quality disclaimer (ADR-0028 / #500):
         it opens the same feedback sheet. Sits just left of the avatar, away from
         scores/standings/money. Config-gated (__SHOW_BETA_TAG__, vite.config.ts) so it
         flips off in one change at the public epoch (issue #697). -->
    <button
      type="button"
      data-testid="beta-tag"
      class="mr-2 rounded-full border border-primary-ink/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-primary-ink uppercase transition-colors hover:bg-primary/20"
      title="Beta — spotting something off? Tell us."
      aria-label="Beta — send feedback"
      onclick={() => openFeedback()}
    >
      Beta
    </button>
  {/if}

  <!-- Avatar dropdown — always far right -->
  <HeaderAccount {user} {canSeeAdmin} {displayName} {avatarKey} {champion} />
</div>

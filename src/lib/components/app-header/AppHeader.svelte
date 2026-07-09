<script lang="ts">
  import type { User } from '@supabase/supabase-js';
  import { page, navigating } from '$app/state';
  import HeaderAccount from '$lib/components/app-header/HeaderAccount.svelte';
  import GroupSwitcher from '$lib/components/app-header/GroupSwitcher.svelte';

  // Wrapped is intentionally absent here: it is a seasonal moment surfaced via the
  // Leaderboard CTA + Group honors link, not a permanent nav destination (see BottomTabBar).
  const navLinks = [
    { href: '/picks', label: 'Picks' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/group', label: 'Group' },
    { href: '/stats', label: 'Stats' },
    { href: '/league', label: 'League' }
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
  }

  let {
    user = null,
    canSeeAdmin = false,
    displayName = '',
    avatarKey = null,
    memberships = [],
    activeGroupId = null,
    champion = false
  }: Props = $props();
</script>

<!-- Fills the h-14 container row provided by +layout.svelte -->
<div class="relative flex w-full items-center">
  <!-- Desktop inline nav (hidden on mobile — bottom tab bar takes over) -->
  <nav data-testid="primary-nav" class="hidden sm:flex items-center gap-1 text-sm font-medium">
    {#each navLinks as { href, label } (href)}
      {@const pendingPath = navigating?.to?.url.pathname ?? page.url.pathname}
      {@const active = pendingPath.startsWith(href)}
      <a
        {href}
        class="px-3 py-1.5 rounded-md transition-colors {active
          ? 'bg-accent text-foreground font-semibold'
          : 'hover:bg-accent'}"
        aria-current={active ? 'page' : undefined}>{label}</a
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
  <div class="mr-auto sm:ml-auto sm:mr-2">
    <GroupSwitcher {memberships} {activeGroupId} />
  </div>

  <!-- Centered logo (absolute so it doesn't push the nav) -->
  <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
    <a
      href="/"
      class="pointer-events-auto flex min-w-0 items-center font-semibold tracking-wide"
      aria-label="Hotshot home"
    >
      <img
        src="/logo-mark.png"
        alt="Hotshot logo"
        class="mr-2 h-10 w-10 shrink-0 md:h-12 md:w-12"
      />
    </a>
  </div>

  <!-- Avatar dropdown — always far right -->
  <HeaderAccount {user} {canSeeAdmin} {displayName} {avatarKey} {champion} />
</div>

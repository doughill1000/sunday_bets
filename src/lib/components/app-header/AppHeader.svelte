<script lang="ts">
  import type { User } from '@supabase/supabase-js';
  import HeaderAccount from '$lib/components/app-header/HeaderAccount.svelte';
  import GroupSwitcher from '$lib/components/app-header/GroupSwitcher.svelte';

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
  }

  let {
    user = null,
    canSeeAdmin = false,
    displayName = '',
    avatarKey = null,
    memberships = [],
    activeGroupId = null
  }: Props = $props();
</script>

<!-- Fills the h-14 container row provided by +layout.svelte -->
<div class="relative flex w-full items-center">
  <!-- Desktop inline nav (hidden on mobile — bottom tab bar takes over) -->
  <nav class="hidden sm:flex items-center gap-1 text-sm font-medium">
    <a href="/picks" class="px-3 py-1.5 rounded-md hover:bg-accent transition-colors">Picks</a>
    <a href="/leaderboard" class="px-3 py-1.5 rounded-md hover:bg-accent transition-colors"
      >Leaderboard</a
    >
    <a href="/stats" class="px-3 py-1.5 rounded-md hover:bg-accent transition-colors">Stats</a>
  </nav>

  <!-- Group switcher (multi-group only; renders nothing otherwise). A single instance
       repositioned by breakpoint via auto-margins:
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
      aria-label="Sunday Bets home"
    >
      <img
        src="/logo-mark.png"
        alt="Sunday Bets logo"
        class="mr-2 h-10 w-10 shrink-0 md:h-12 md:w-12"
      />
    </a>
  </div>

  <!-- Avatar dropdown — always far right -->
  <HeaderAccount {user} {canSeeAdmin} {displayName} {avatarKey} />
</div>

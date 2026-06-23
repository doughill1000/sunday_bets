<script lang="ts">
  import type { User } from '@supabase/supabase-js';
  import HeaderAccount from '$lib/components/app-header/HeaderAccount.svelte';

  interface Props {
    user?: User | null;
    canSeeAdmin?: boolean;
    displayName?: string;
    avatarKey?: string | null;
  }

  let { user = null, canSeeAdmin = false, displayName = '', avatarKey = null }: Props = $props();
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

  <!-- Right side: avatar dropdown -->
  <div class="ml-auto">
    <HeaderAccount {user} {canSeeAdmin} {displayName} {avatarKey} />
  </div>
</div>

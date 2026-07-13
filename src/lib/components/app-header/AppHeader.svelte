<script lang="ts">
  import type { User } from '@supabase/supabase-js';
  import { page, navigating } from '$app/state';
  import HeaderAccount from '$lib/components/app-header/HeaderAccount.svelte';
  import GroupSwitcher from '$lib/components/app-header/GroupSwitcher.svelte';
  import { openFeedback } from '$lib/feedback/store';

  // Four first-class tabs after the #561 IA merge (see BottomTabBar): League is the merged
  // Leaderboard+Group home (with a Members & manage subpage at /league/manage), and Teams is the
  // former "League" market ATS page renamed. Wrapped is intentionally absent: it is a seasonal
  // moment surfaced via the League home CTA + honors card link, not a permanent nav destination.
  const navLinks = [
    { href: '/picks', label: 'Picks' },
    { href: '/league', label: 'League' },
    { href: '/stats', label: 'Stats' },
    { href: '/teams', label: 'Teams' }
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
      <!-- The mark's SVG carries generous transparent padding (the football fills
           only ~44% of the viewBox height), so it reads small at box size. We size
           the box larger than the h-14 header row: the visible ink grows while the
           transparent margins overflow the header invisibly, keeping the mark
           optically centered without pushing the surrounding chrome. -->
      <img src="/logo-mark.svg" alt="Hotshot logo" class="h-16 w-16 shrink-0 md:h-20 md:w-20" />
    </a>
  </div>

  {#if user}
    <!-- "Beta" is an invitation to report, not a quality disclaimer (ADR-0028 / #500):
         it opens the same feedback sheet. Sits just left of the avatar, away from
         scores/standings/money. -->
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

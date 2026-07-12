<script lang="ts">
  // Mobile bottom tab bar for the /demo route group (#460), mirroring the authenticated
  // app's BottomTabBar so the demo navigates the same way the real product does — fixed
  // icon tabs instead of a horizontally-scrolling top nav you have to slide to read.
  import { page } from '$app/state';
  import ListChecks from '@lucide/svelte/icons/list-checks';
  import Trophy from '@lucide/svelte/icons/trophy';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import Newspaper from '@lucide/svelte/icons/newspaper';

  const tabs = [
    { href: '/demo', label: 'Picks', exact: true, Icon: ListChecks },
    // Keeps the /demo/leaderboard route but mirrors the app's #561 "Leaderboard" → "League" rename.
    { href: '/demo/leaderboard', label: 'League', exact: false, Icon: Trophy },
    { href: '/demo/wrapped', label: 'Wrapped', exact: false, Icon: Sparkles },
    { href: '/demo/recap', label: 'Recap', exact: false, Icon: Newspaper }
  ];

  function isActive(href: string, exact: boolean): boolean {
    const path = page.url.pathname;
    return exact ? path === href : path.startsWith(href);
  }
</script>

<nav
  data-testid="demo-bottom-tab-bar"
  class="fixed bottom-0 left-0 right-0 z-40 flex border-t bg-background/95 backdrop-blur-sm sm:hidden"
  style="padding-bottom: env(safe-area-inset-bottom)"
  aria-label="Demo sections"
>
  {#each tabs as { href, label, exact, Icon } (href)}
    {@const active = isActive(href, exact)}
    <a
      {href}
      data-testid="demo-tab-{label.toLowerCase()}"
      class="flex flex-1 flex-col items-center gap-1 px-2 py-3.5 text-[10px] font-medium transition-colors
        {active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}"
      aria-current={active ? 'page' : undefined}
    >
      <Icon class="size-6" />
      {label}
    </a>
  {/each}
</nav>

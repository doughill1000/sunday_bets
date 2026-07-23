<script lang="ts">
  // Mobile bottom tab bar for the /demo route group (#460), mirroring the authenticated app's
  // BottomTabBar — same five tabs (Picks · Week · League · Stats · Market, #776), same order,
  // same icons (#669) — so the demo navigates exactly the way the real product does. No live
  // dot here: the snapshot season has concluded, so there is never a live window to signal.
  import { page } from '$app/state';
  import ListChecks from '@lucide/svelte/icons/list-checks';
  import CalendarDays from '@lucide/svelte/icons/calendar-days';
  import Trophy from '@lucide/svelte/icons/trophy';
  import BarChart2 from '@lucide/svelte/icons/bar-chart-2';
  import TrendingUp from '@lucide/svelte/icons/trending-up';

  const tabs = [
    { href: '/demo', label: 'Picks', exact: true, Icon: ListChecks },
    { href: '/demo/week', label: 'Week', exact: false, Icon: CalendarDays },
    { href: '/demo/league', label: 'League', exact: false, Icon: Trophy },
    { href: '/demo/stats', label: 'Stats', exact: false, Icon: BarChart2 },
    { href: '/demo/market', label: 'Market', exact: false, Icon: TrendingUp }
  ];

  function isActive(href: string, exact: boolean): boolean {
    const path = page.url.pathname;
    return exact ? path === href : path.startsWith(href);
  }
</script>

<nav
  data-testid="demo-bottom-tab-bar"
  class="fixed right-0 bottom-0 left-0 z-40 flex border-t bg-background/95 backdrop-blur-sm sm:hidden"
  style="padding-bottom: env(safe-area-inset-bottom)"
  aria-label="Demo sections"
>
  {#each tabs as { href, label, exact, Icon } (href)}
    {@const active = isActive(href, exact)}
    <a
      {href}
      data-testid="demo-tab-{label.toLowerCase()}"
      class="flex flex-1 flex-col items-center gap-1 px-2 py-3.5 text-[10px] font-medium transition-colors
        {active ? 'text-primary-ink' : 'text-muted-foreground hover:text-foreground'}"
      aria-current={active ? 'page' : undefined}
    >
      <Icon class="size-6" />
      {label}
    </a>
  {/each}
</nav>

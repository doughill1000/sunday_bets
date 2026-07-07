<script lang="ts">
  import { page, navigating } from '$app/state';
  import ListChecks from '@lucide/svelte/icons/list-checks';
  import Trophy from '@lucide/svelte/icons/trophy';
  import BarChart2 from '@lucide/svelte/icons/bar-chart-2';
  import Users from '@lucide/svelte/icons/users';
  import TrendingUp from '@lucide/svelte/icons/trending-up';

  // Wrapped is a seasonal moment, not a year-round destination — it has no content until a
  // season finalises. Rather than burn a permanent tab on an empty-most-of-the-year page,
  // it is surfaced via a seasonal CTA on the Leaderboard (WrappedPromo) and a link from the
  // Group honors card when a Wrapped exists.
  const tabs = [
    { href: '/picks', label: 'Picks', Icon: ListChecks },
    { href: '/leaderboard', label: 'Leaderboard', Icon: Trophy },
    { href: '/stats', label: 'Stats', Icon: BarChart2 },
    { href: '/group', label: 'Group', Icon: Users },
    { href: '/league', label: 'League', Icon: TrendingUp }
  ];
</script>

<nav
  data-testid="bottom-tab-bar"
  class="fixed bottom-0 left-0 right-0 z-40 flex border-t bg-background/95 backdrop-blur-sm sm:hidden"
  style="padding-bottom: env(safe-area-inset-bottom)"
>
  {#each tabs as { href, label, Icon } (href)}
    {@const pendingPath = navigating?.to?.url.pathname ?? page.url.pathname}
    {@const active = pendingPath.startsWith(href)}
    <a
      {href}
      class="flex flex-1 flex-col items-center gap-1 px-2 py-3.5 text-[10px] font-medium transition-colors
        {active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}"
      aria-current={active ? 'page' : undefined}
    >
      <Icon class="size-6" />
      {label}
    </a>
  {/each}
</nav>

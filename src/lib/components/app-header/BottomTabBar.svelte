<script lang="ts">
  import { page, navigating } from '$app/state';
  import ListChecks from '@lucide/svelte/icons/list-checks';
  import Trophy from '@lucide/svelte/icons/trophy';
  import BarChart2 from '@lucide/svelte/icons/bar-chart-2';
  import TrendingUp from '@lucide/svelte/icons/trending-up';

  // Four first-class tabs after the #561 IA merge: Picks, League (the merged Leaderboard+Group
  // home — standings, the season race, honors, and the Members & manage subpage), Stats, and
  // Teams (the former "League" market ATS page, renamed so the user's own league owns the name).
  // Wrapped is a seasonal moment, not a year-round destination — it has no content until a season
  // finalises, so rather than burn a permanent tab it is surfaced via the League home CTA
  // (WrappedPromo) and the honors card's Wrapped link when one exists.
  const tabs = [
    { href: '/picks', label: 'Picks', Icon: ListChecks },
    { href: '/league', label: 'League', Icon: Trophy },
    { href: '/stats', label: 'Stats', Icon: BarChart2 },
    { href: '/teams', label: 'Teams', Icon: TrendingUp }
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
      class="flex flex-1 flex-col items-center gap-1 px-2 py-3.5 text-[11px] font-medium transition-colors
        {active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}"
      aria-current={active ? 'page' : undefined}
    >
      <Icon class="size-6" />
      {label}
    </a>
  {/each}
</nav>

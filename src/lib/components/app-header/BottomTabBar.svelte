<script lang="ts">
  import { page, navigating } from '$app/state';
  import ListChecks from '@lucide/svelte/icons/list-checks';
  import CalendarDays from '@lucide/svelte/icons/calendar-days';
  import Trophy from '@lucide/svelte/icons/trophy';
  import BarChart2 from '@lucide/svelte/icons/bar-chart-2';
  import TrendingUp from '@lucide/svelte/icons/trending-up';

  // Five first-class tabs since #776 promoted Week out of /league: Picks, Week (the selected
  // week's hardware + pick breakdown — the highest-frequency, most time-sensitive surface, so it
  // sits second), League (standings + the trophy room, with the commissioner console subpage),
  // Stats, and Market (the NFL-wide ATS surface — the same for everyone). "Market" is deliberately
  // never called "League": League = the user's own group, Market = the NFL side, so the word never
  // collides. Wrapped is a seasonal moment, not a year-round destination — it is surfaced via the
  // League honors card's Wrapped link when one exists (#737 retired the separate WrappedPromo CTA).
  //
  // `weekLive` renders a pulsing dot on the Week tab while an active-week game is inside its live
  // window (#776, replacing #584's auto-flip of /league onto the Week tab). It reuses the red
  // live-signal of WeeklyLiveBoard's LIVE badge — one pattern per job — rather than gold, which
  // already marks the active tab and is reserved for the champion crown (DESIGN.md P13).
  let { weekLive = false }: { weekLive?: boolean } = $props();

  const tabs = [
    { href: '/picks', label: 'Picks', Icon: ListChecks },
    { href: '/week', label: 'Week', Icon: CalendarDays },
    { href: '/league', label: 'League', Icon: Trophy },
    { href: '/stats', label: 'Stats', Icon: BarChart2 },
    { href: '/market', label: 'Market', Icon: TrendingUp }
  ];
</script>

<nav
  data-testid="bottom-tab-bar"
  class="fixed right-0 bottom-0 left-0 z-40 flex border-t bg-background/95 backdrop-blur-sm sm:hidden"
  style="padding-bottom: env(safe-area-inset-bottom)"
>
  {#each tabs as { href, label, Icon } (href)}
    {@const pendingPath = navigating?.to?.url.pathname ?? page.url.pathname}
    {@const active = pendingPath.startsWith(href)}
    <a
      {href}
      class="flex flex-1 flex-col items-center gap-1 px-2 py-3.5 text-[11px] font-medium transition-colors
        {active ? 'text-primary-ink' : 'text-muted-foreground hover:text-foreground'}"
      aria-current={active ? 'page' : undefined}
    >
      <span class="relative">
        <Icon class="size-6" />
        {#if href === '/week' && weekLive}
          <span
            data-testid="week-live-dot"
            class="absolute -top-0.5 -right-0.5 size-2 animate-pulse rounded-full bg-destructive"
          ></span>
          <span class="sr-only">— games live now</span>
        {/if}
      </span>
      {label}
    </a>
  {/each}
</nav>

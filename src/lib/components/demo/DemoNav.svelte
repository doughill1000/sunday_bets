<script lang="ts">
  // Demo-only top chrome (#460): a "DEMO" wordmark + the mirrored surface nav (Picks →
  // Leaderboard → Wrapped → Recap, the "here's how you play → here's what it builds to" arc) +
  // a persistent sign-up CTA. Replaces the authenticated AppHeader for the /demo route group.
  import { page } from '$app/state';
  import DemoSignupCta from './DemoSignupCta.svelte';

  const links = [
    { href: '/demo', label: 'Picks', exact: true },
    { href: '/demo/leaderboard', label: 'Leaderboard', exact: false },
    { href: '/demo/wrapped', label: 'Wrapped', exact: false },
    { href: '/demo/recap', label: 'Recap', exact: false }
  ];

  function isActive(href: string, exact: boolean): boolean {
    const path = page.url.pathname;
    return exact ? path === href : path.startsWith(href);
  }
</script>

<header
  class="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
>
  <div class="container mx-auto flex h-14 items-center gap-4 px-4">
    <a
      href="/demo"
      class="flex items-center gap-2 font-bold tracking-tight"
      data-testid="demo-home"
    >
      <img src="/logo-mark.svg" alt="" class="h-6 w-6 shrink-0" />
      Hotshot
      <span
        class="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary"
      >
        Demo
      </span>
    </a>

    <!-- Desktop inline nav — on mobile the fixed DemoBottomTabBar takes over, matching the
         authenticated app so there's no horizontally-scrolling row to slide through. -->
    <nav class="hidden flex-1 items-center gap-1 sm:flex" aria-label="Demo sections">
      {#each links as link (link.href)}
        <a
          href={link.href}
          data-testid="demo-nav-{link.label.toLowerCase()}"
          aria-current={isActive(link.href, link.exact) ? 'page' : undefined}
          class="rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors {isActive(
            link.href,
            link.exact
          )
            ? 'bg-muted text-foreground'
            : 'text-muted-foreground hover:text-foreground'}"
        >
          {link.label}
        </a>
      {/each}
    </nav>

    <DemoSignupCta label="Start your league" size="sm" class="ml-auto inline-flex" />
  </div>
</header>

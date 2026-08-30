<script lang="ts">
  // Public rules page for the demo (#864, ADR-0026). A stranger reading the frozen season
  // sees the payoff but never the verb, and every existing door to the rules is behind auth
  // (`(app)/how-to-play` redirects a session-less request to `/auth`; WelcomeGuide only
  // mounts under `{#if user}`).
  //
  // `HowToPlay.svelte` takes no props and touches no session, store, or query, so unlike
  // /demo/league and /demo/market — hand-written mirrors — this surface needs no mirror at
  // all. The same component renders on both sides of the auth line and the rules can never
  // drift between the demo and the app.
  //
  // Reached from the DemoBanner link, not the nav: DemoNav/DemoBottomTabBar deliberately
  // mirror the real app's exact five tabs, and How to Play is not a tab there either.
  import HowToPlay from '$lib/components/howto/HowToPlay.svelte';
  import BackLink from '$lib/components/BackLink.svelte';
</script>

<svelte:head>
  <title>How to Play | Hotshot Demo</title>
  <meta
    name="description"
    content="How Hotshot works — pick against the spread, weight each pick, and go All-In once a season."
  />
</svelte:head>

<!-- No padding of its own — the demo layout already pads (see /demo/recap, #768). -->
<section class="mx-auto max-w-lg space-y-4">
  <div>
    <BackLink href="/demo" label="Demo" testId="demo-how-to-play-back" />
    <h1 class="mt-1 text-2xl font-bold tracking-tight" data-testid="demo-how-to-play-heading">
      How to Play
    </h1>
  </div>
  <HowToPlay />
</section>

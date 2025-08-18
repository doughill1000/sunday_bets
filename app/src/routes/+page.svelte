<!-- apps/web/src/routes/+page.svelte -->
<script lang="ts">
  import Brand from '$lib/Brand.svelte';
  import { WEIGHTS } from '$lib/scoring';
</script>

<section class="relative overflow-hidden rounded-2xl border border-surface-600/20 bg-surface-500/5 shadow-lg">
  <!-- Hero background accent -->
  <div class="absolute inset-0 bg-gradient-to-br from-sky-500/20 via-emerald-500/20 to-surface-500/5"></div>

  <div class="relative z-10 flex flex-col items-center text-center px-6 py-16 md:py-24">
    <Brand size={56} />

    <p class="mt-4 max-w-xl text-lg text-surface-200 scheme-dark:text-surface-200">
      Lock your picks each week, track your friends, and climb the leaderboard.
      Choose your weight wisely — <span class="font-semibold">L / M / H / A</span> can make or break the season.
    </p>

    <div class="mt-8 flex flex-wrap justify-center gap-4">
      <a href="/picks" class="btn preset-filled">Make Picks</a>
      <a href="/leaderboard" class="btn preset-tonal">View Leaderboard</a>
    </div>
  </div>
</section>

<!-- Optional secondary info -->
<section class="mt-12 grid gap-6 md:grid-cols-3">
  <div class="rounded-xl border border-surface-600/20 bg-surface-500/5 p-6 shadow-sm">
    <h2 class="font-semibold text-lg mb-2">Weekly Games</h2>
    <p class="text-surface-700 scheme-dark:text-surface-200 text-sm">
      Every matchup, every spread — lock in your confidence picks before kickoff.
    </p>
  </div>

  <div class="rounded-xl border border-surface-600/20 bg-surface-500/5 p-6 shadow-sm">
    <h2 class="font-semibold text-lg mb-2">Weighted Picks</h2>
    <ul class="space-y-1 text-surface-700 scheme-dark:text-surface-200 text-sm">
      {#each Object.entries(WEIGHTS) as [code, w]}
        <li>
          <span class="font-semibold">{code}</span> — {w.label} ({w.points})
        </li>
      {/each}
    </ul>
  </div>

  <div class="rounded-xl border border-surface-600/20 bg-surface-500/5 p-6 shadow-sm">
    <h2 class="font-semibold text-lg mb-2">Leaderboard</h2>
    <p class="text-surface-700 scheme-dark:text-surface-200 text-sm">
      Totals update weekly — bragging rights belong to the season’s sharpest picker.
    </p>
  </div>
</section>

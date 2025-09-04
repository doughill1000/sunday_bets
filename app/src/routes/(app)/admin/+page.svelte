<script lang="ts">
  import type { PageData } from './$types';
  import { ProgressRing } from '@skeletonlabs/skeleton-svelte';

  export let data: PageData;

  let syncing = false;
  let resultMsg: string | null = null;
  let resultKind: 'success' | 'warn' | 'error' | null = null;

  const cap = data.settings.cap;
  const used = data.settings.used;
  const remaining = data.settings.remaining;
  const usagePct = data.settings.usagePct;

  const usage80 = usagePct >= 0.8;
  const capReached = remaining <= 0;

  async function syncOdds() {
    resultMsg = null;
    resultKind = null;
    syncing = true;
    try {
      const res = await fetch('/api/admin/sync-odds', { method: 'POST' });
      const body = await res.json().catch(() => ({}));

      if (res.ok) {
        const count = typeof body.count === 'number' ? body.count : 'unknown';
        resultMsg = `Synced odds successfully. Updated ${count} games.`;
        resultKind = 'success';

        data.settings.used += 1;
        data.settings.remaining = Math.max(data.settings.cap - data.settings.used, 0);
        data.settings.usagePct =
          data.settings.cap > 0 ? Math.min(data.settings.used / data.settings.cap, 1) : 1;
      } else if (res.status === 429) {
        resultMsg = body?.reason ?? 'Monthly cap reached. Try again next month.';
        resultKind = 'warn';
      } else if (res.status === 400) {
        resultMsg = body?.reason ?? 'No active week window is currently active.';
        resultKind = 'warn';
      } else {
        resultMsg = body?.reason ?? `Sync failed with status ${res.status}.`;
        resultKind = 'error';
      }
    } catch {
      resultMsg = 'Network or server error while syncing odds.';
      resultKind = 'error';
    } finally {
      syncing = false;
    }
  }
</script>

<section class="mx-auto max-w-3xl p-4 sm:p-6">
  <div class="rounded-2xl border border-surface-400/30 bg-surface-900/60 p-5 shadow-lg">
    <header class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-bold">Admin • Odds Sync</h1>
      {#if data.activeWeek}
        <div class="text-sm opacity-80">
          Active Week: <span class="font-semibold">#{data.activeWeek.week_number}</span>
        </div>
      {:else}
        <div class="text-sm opacity-80">No active week</div>
      {/if}
    </header>

    <!-- Cap / usage -->
    <div class="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3 text-center">
      <div>
        <div class="text-xs opacity-70">Monthly Cap</div>
        <div class="text-2xl font-semibold">{cap}</div>
      </div>
      <div>
        <div class="text-xs opacity-70">Calls Used</div>
        <div class="text-2xl font-semibold">{data.settings.used}</div>
      </div>
      <div>
        <div class="text-xs opacity-70">Remaining</div>
        <div class="text-2xl font-semibold">{data.settings.remaining}</div>
      </div>
    </div>

    <!-- Progress + warnings -->
    <div class="mb-4 flex items-center gap-3">
      <ProgressRing value={data.settings.usagePct * 100} max={100} size="lg" />
      <div class="text-sm opacity-85">
        {#if capReached}
          <span class="text-warning-500 font-medium">Cap reached.</span> Sync is disabled.
        {:else if usage80}
          <span class="text-warning-500 font-medium">High usage:</span> Over 80% of the monthly cap.
        {:else}
          Within budget. Proceed as needed.
        {/if}
      </div>
    </div>

    <!-- Action -->
    <div class="mt-2 flex items-center gap-3">
      <button
        class="btn variant-filled-primary"
        onclick={syncOdds}
        disabled={syncing || capReached}
      >
        {#if syncing}Syncing…{:else}Sync Odds{/if}
      </button>
    </div>

    {#if resultMsg}
      <div
        class="mt-4 rounded-xl border p-3 text-sm"
        class:border-success-500={resultKind === 'success'}
        class:border-warning-500={resultKind === 'warn'}
        class:border-error-500={resultKind === 'error'}
      >
        {resultMsg}
      </div>
    {/if}
  </div>
</section>

<script lang="ts">
  import { Progress } from '$lib/components/ui/progress';
  import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent
  } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { syncOdds as syncOddsApi } from '$lib/api/admin/odds'; // Import the new helper

  export let settings: { cap: number; used: number; remaining: number; usagePct: number };
  export let activeWeek: { id: number; week_number: number } | null;
  export let onNote: ((kind: 'success' | 'warn' | 'error', text: string) => void) | undefined;

  let syncing = false;

  function note(kind: 'success' | 'warn' | 'error', text: string) {
    onNote?.(kind, text);
  }

  async function syncOdds() {
    syncing = true;
    try {
      const body = await syncOddsApi();
      const count = typeof body.count === 'number' ? body.count : 'unknown';
      note('success', `Synced odds. Updated ${count} games.`);
      // Optimistically update the UI
      settings.used += 1;
      settings.remaining = Math.max(settings.cap - settings.used, 0);
      settings.usagePct = settings.cap ? Math.min(settings.used / settings.cap, 1) : 1;
    } catch (err: any) {
      // The generic helper preserves the status code
      if (err.status === 429) {
        note('warn', err.message ?? 'Monthly cap reached.');
      } else if (err.status === 400) {
        note('warn', err.message ?? 'No active week.');
      } else {
        note('error', err.message ?? 'An unknown error occurred.');
      }
    } finally {
      syncing = false;
    }
  }

  $: usage80 = settings.usagePct >= 0.8;
  $: capReached = settings.remaining <= 0;
</script>

<Card class="p-6">
  <CardHeader class="mb-4 flex items-center justify-between">
    <CardTitle class="text-xl font-bold">Admin • Odds Sync</CardTitle>
    <CardDescription class="text-sm text-muted-foreground">
      {#if activeWeek}Active Week #{activeWeek.week_number}{:else}No active week{/if}
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div class="mb-5 grid grid-cols-1 gap-4 text-center sm:grid-cols-3">
      <div>
        <div class="text-xs opacity-70">Monthly Cap</div>
        <div class="text-2xl font-semibold">{settings.cap}</div>
      </div>
      <div>
        <div class="text-xs opacity-70">Calls Used</div>
        <div class="text-2xl font-semibold">{settings.used}</div>
      </div>
      <div>
        <div class="text-xs opacity-70">Remaining</div>
        <div class="text-2xl font-semibold">{settings.remaining}</div>
      </div>
    </div>

    <div class="mb-4 flex items-center gap-3">
      <Progress value={settings.usagePct * 100} max={100} class="h-3 w-32" />
      <div class="text-sm opacity-85">
        {#if capReached}
          <span class="font-medium text-red-500">Cap reached.</span>
        {:else if usage80}
          <span class="font-medium text-amber-500">Over 80% used.</span>
        {:else}
          Within budget.
        {/if}
      </div>
    </div>

    <div class="mt-2 flex items-center gap-3">
      <Button variant="default" onclick={syncOdds} disabled={syncing || capReached}>
        {#if syncing}Syncing…{:else}Sync Odds{/if}
      </Button>
    </div>
  </CardContent>
</Card>

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

  interface Props {
    settings: { cap: number; used: number; remaining: number; usagePct: number };
    activeWeek: { id: number; week_number: number } | null;
    onNote?: (kind: 'success' | 'warn' | 'error', text: string) => void;
  }
  let { settings, activeWeek, onNote }: Props = $props();

  let syncing = $state(false);

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
    } catch (err) {
      // The generic helper preserves the status code on the thrown Error
      const e = err as { status?: number; message?: string };
      if (e.status === 429) {
        note('warn', e.message ?? 'Monthly cap reached.');
      } else if (e.status === 400) {
        note('warn', e.message ?? 'No active week.');
      } else {
        note('error', e.message ?? 'An unknown error occurred.');
      }
    } finally {
      syncing = false;
    }
  }

  const usage80 = $derived(settings.usagePct >= 0.8);
  const capReached = $derived(settings.remaining <= 0);
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
          <span class="font-medium text-destructive">Cap reached.</span>
        {:else if usage80}
          <span class="font-medium text-warning">Over 80% used.</span>
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

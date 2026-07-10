<script lang="ts">
  import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent
  } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { syncSchedule as syncScheduleApi } from '$lib/api/admin/schedule';

  interface Props {
    onNote?: (kind: 'success' | 'warn' | 'error', text: string) => void;
  }
  let { onNote }: Props = $props();

  let syncing = $state(false);
  // Jan–Aug = current year (upcoming season); Sep–Dec = current year (in-season).
  const year = new Date().getFullYear();

  function note(kind: 'success' | 'warn' | 'error', text: string) {
    onNote?.(kind, text);
  }

  async function syncSchedule() {
    syncing = true;
    try {
      const res = await syncScheduleApi(year);
      if (!res.ok) {
        note('warn', `Schedule sync error: ${'reason' in res ? res.reason : 'unknown'}`);
        return;
      }
      note(
        res.weeksFailed > 0 ? 'warn' : 'success',
        `Schedule sync ${year}: ${res.gamesUpserted} games across ${res.weeksProcessed} weeks` +
          (res.gamesSkipped > 0 ? `, ${res.gamesSkipped} skipped (unmapped teams)` : '') +
          (res.weeksFailed > 0 ? `, ${res.weeksFailed} weeks failed (ESPN error)` : '')
      );
    } catch (err) {
      const e = err as { message?: string };
      note('error', e.message ?? 'Schedule sync failed');
    } finally {
      syncing = false;
    }
  }
</script>

<Card class="p-6">
  <CardHeader class="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
    <CardTitle class="text-xl font-bold">Admin • Schedule Sync</CardTitle>
    <CardDescription class="text-sm text-muted-foreground">{year} NFL Season</CardDescription>
  </CardHeader>
  <CardContent>
    <p class="mb-4 text-sm text-muted-foreground">
      Seeds all {year} regular-season weeks and games from ESPN. Safe to re-run — updates kickoff times
      in place without disturbing picks or lines.
    </p>
    <Button variant="default" onclick={syncSchedule} disabled={syncing}>
      {#if syncing}Syncing…{:else}Sync Schedule{/if}
    </Button>
  </CardContent>
</Card>

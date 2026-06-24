<script lang="ts">
  import type { PageData } from './$types';
  import OddsSyncCard from '$lib/components/admin/OddsSyncCard.svelte';
  import ScheduleSyncCard from '$lib/components/admin/ScheduleSyncCard.svelte';
  import GradingCard from '$lib/components/admin/GradingCard.svelte';
  import TestNotificationCard from '$lib/components/admin/TestNotificationCard.svelte';
  import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
  import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell
  } from '$lib/components/ui/table';

  let { data }: { data: PageData } = $props();

  // shared notification state
  let msg: { kind: 'success' | 'warn' | 'error'; text: string } | null = $state(null);

  function handleNote(kind: 'success' | 'warn' | 'error', text: string) {
    msg = { kind, text };
  }

  function formatDuration(started_at: string, finished_at: string | null): string {
    if (!finished_at) return 'running';
    const ms = new Date(finished_at).getTime() - new Date(started_at).getTime();
    return `${(ms / 1000).toFixed(1)}s`;
  }
</script>

<section class="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
  <OddsSyncCard settings={data.settings} activeWeek={data.activeWeek} onNote={handleNote} />

  <ScheduleSyncCard onNote={handleNote} />

  <GradingCard activeWeek={data.activeWeek} onNote={handleNote} />

  <TestNotificationCard onNote={handleNote} />

  {#if msg}
    <div
      class="mt-2 rounded-xl border p-3 text-sm"
      class:border-success={msg.kind === 'success'}
      class:border-warning={msg.kind === 'warn'}
      class:border-destructive={msg.kind === 'error'}
    >
      {msg.text}
    </div>
  {/if}

  <Card class="p-6">
    <CardHeader class="mb-4">
      <CardTitle class="text-xl font-bold">Cron Runs</CardTitle>
    </CardHeader>
    <CardContent>
      {#if data.cronRuns.length === 0}
        <p class="text-sm text-muted-foreground">No cron runs recorded yet.</p>
      {:else}
        <div class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {#each data.cronRuns as run (run.id)}
                <TableRow>
                  <TableCell class="font-mono text-xs">{run.job}</TableCell>
                  <TableCell class="text-xs">{new Date(run.started_at).toLocaleString()}</TableCell>
                  <TableCell class="text-xs"
                    >{formatDuration(run.started_at, run.finished_at)}</TableCell
                  >
                  <TableCell class="text-xs">
                    {#if run.ok === true}
                      <span class="font-medium text-success">ok</span>
                    {:else if run.ok === false}
                      <span class="font-medium text-destructive">failed</span>
                    {:else}
                      <span class="font-medium text-warning">running</span>
                    {/if}
                  </TableCell>
                  <TableCell class="max-w-xs truncate text-xs text-muted-foreground">
                    {run.error ?? '—'}
                  </TableCell>
                </TableRow>
              {/each}
            </TableBody>
          </Table>
        </div>
      {/if}
    </CardContent>
  </Card>
</section>

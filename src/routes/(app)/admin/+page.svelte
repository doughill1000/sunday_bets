<script lang="ts">
  import type { PageData } from './$types';
  import OddsSyncCard from '$lib/components/admin/OddsSyncCard.svelte';
  import ScheduleSyncCard from '$lib/components/admin/ScheduleSyncCard.svelte';
  import GradingCard from '$lib/components/admin/GradingCard.svelte';
  import TestNotificationCard from '$lib/components/admin/TestNotificationCard.svelte';
  import AddMemberCard from '$lib/components/admin/AddMemberCard.svelte';
  import GameplaySettingsCard from '$lib/components/admin/GameplaySettingsCard.svelte';
  import FormNote from '$lib/components/FormNote.svelte';
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

  const headroom = $derived(data.notificationHeadroom);
  const headroomLabel = $derived(
    headroom.headroomPct == null ? '—' : `${Math.round(headroom.headroomPct * 100)}%`
  );
</script>

<section class="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
  <a
    href="/admin/feedback"
    class="flex items-center justify-between rounded-xl border p-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
  >
    <span>Feedback inbox — review in-app reports (issue #500)</span>
    <span aria-hidden="true">→</span>
  </a>

  <OddsSyncCard settings={data.settings} activeWeek={data.activeWeek} onNote={handleNote} />

  <ScheduleSyncCard onNote={handleNote} />

  <GradingCard
    activeWeek={data.activeWeek}
    weeks={data.weeks}
    seasons={data.seasons}
    onNote={handleNote}
  />

  <TestNotificationCard onNote={handleNote} />

  <AddMemberCard onNote={handleNote} />

  <GameplaySettingsCard
    finalWeekUnlimitedAllin={data.gameplay.finalWeekUnlimitedAllin}
    onNote={handleNote}
  />

  {#if msg}
    <FormNote kind={msg.kind === 'warn' ? 'warning' : msg.kind} text={msg.text} class="mt-2" />
  {/if}

  <Card class="p-6">
    <CardHeader class="mb-4">
      <CardTitle class="text-xl font-bold">Scaling signals</CardTitle>
    </CardHeader>
    <CardContent class="space-y-2 text-sm">
      <p class="text-muted-foreground">
        Notification cron (<span class="font-mono text-xs">{headroom.job}</span>) duration vs the
        Vercel function timeout ({headroom.timeoutSeconds}s). Tier-B trigger: move the reminder
        fan-out off the request path when headroom falls to/under 50%. See
        <span class="font-mono text-xs">docs/observability/scaling-signals.md</span>.
      </p>
      {#if headroom.sampleCount === 0}
        <p class="text-muted-foreground">No finished notification-cron runs recorded yet.</p>
      {:else}
        <div class="flex flex-wrap gap-x-6 gap-y-1">
          <span>Latest: <strong>{headroom.latestDurationSeconds?.toFixed(1)}s</strong></span>
          <span
            >Worst of {headroom.sampleCount}:
            <strong>{headroom.maxDurationSeconds?.toFixed(1)}s</strong></span
          >
          <span>
            Headroom:
            <strong class:text-destructive={headroom.warn} class:text-success={!headroom.warn}>
              {headroomLabel}
            </strong>
          </span>
        </div>
        {#if headroom.warn}
          <p class="text-destructive">
            Notification cron is using over half the function timeout — evaluate the Tier-B
            background/queue path.
          </p>
        {/if}
      {/if}
    </CardContent>
  </Card>

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

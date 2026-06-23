<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Label } from '$lib/components/ui/label';
  import { Input } from '$lib/components/ui/input';
  import {
    isPushSupported,
    notificationPermission,
    subscribeToPush,
    unsubscribeFromPush
  } from '$lib/push/client';

  let { data }: { data: PageData } = $props();

  let enabled = $state(data.prefs.enabled);
  let pickReminders = $state(data.prefs.pick_reminders);
  let lineShiftEnabled = $state(data.prefs.line_shift.enabled);
  let threshold = $state(data.prefs.line_shift.threshold);

  let supported = $state(true);
  let permission = $state<NotificationPermission | 'unsupported'>('default');
  let busy = $state(false);
  let msg = $state<{ kind: 'success' | 'error' | 'warn'; text: string } | null>(null);

  onMount(() => {
    supported = isPushSupported();
    permission = notificationPermission();
  });

  async function savePrefs(): Promise<boolean> {
    const res = await fetch('/api/push/prefs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled,
        pick_reminders: pickReminders,
        line_shift: { enabled: lineShiftEnabled, threshold: Number(threshold) }
      })
    });
    if (!res.ok) {
      msg = { kind: 'error', text: 'Could not save settings.' };
      return false;
    }
    return true;
  }

  async function toggleMaster() {
    if (busy) return;
    busy = true;
    msg = null;
    try {
      if (!enabled) {
        const r = await subscribeToPush();
        if (!r.ok) {
          msg = {
            kind: 'warn',
            text:
              r.reason === 'permission-denied'
                ? 'Notification permission was denied in your browser settings.'
                : r.reason === 'unsupported'
                  ? 'This browser/device does not support push notifications.'
                  : 'Could not enable notifications. Please try again.'
          };
          return;
        }
        enabled = true;
      } else {
        await unsubscribeFromPush();
        enabled = false;
      }
      permission = notificationPermission();
      if (await savePrefs()) msg = { kind: 'success', text: 'Settings saved.' };
    } finally {
      busy = false;
    }
  }

  async function onSubPrefChange() {
    if (await savePrefs()) msg = { kind: 'success', text: 'Settings saved.' };
  }
</script>

<section class="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
  <h1 class="text-2xl font-bold">Settings</h1>

  <Card class="p-6">
    <CardHeader class="mb-2 p-0">
      <CardTitle class="text-xl font-bold">Notifications</CardTitle>
    </CardHeader>
    <CardContent class="space-y-5 p-0 pt-2">
      {#if !supported}
        <div class="rounded-xl border border-warning p-3 text-sm">
          This browser doesn't support push notifications. On iPhone, add Sunday Bets to your Home
          Screen (Share → Add to Home Screen) and use iOS 16.4 or later.
        </div>
      {:else if permission === 'denied'}
        <div class="rounded-xl border border-warning p-3 text-sm">
          Notifications are blocked in your browser settings. Re-allow them for this site, then
          enable below.
        </div>
      {/if}

      <div class="flex items-center justify-between gap-4">
        <div>
          <div class="font-medium">Push notifications</div>
          <p class="text-sm text-muted-foreground">
            Master switch for all notifications on this device.
          </p>
        </div>
        <Button
          onclick={toggleMaster}
          disabled={busy || !supported}
          variant={enabled ? 'secondary' : 'default'}
        >
          {busy ? 'Working…' : enabled ? 'Disable' : 'Enable'}
        </Button>
      </div>

      <div class="space-y-4" class:opacity-50={!enabled} class:pointer-events-none={!enabled}>
        <label class="flex items-start gap-3">
          <input
            type="checkbox"
            class="mt-1 size-4"
            bind:checked={pickReminders}
            onchange={onSubPrefChange}
            disabled={!enabled}
          />
          <span>
            <span class="font-medium">Pick reminders</span>
            <p class="text-sm text-muted-foreground">
              A nudge when you still have unpicked games kicking off within about 3 hours.
            </p>
          </span>
        </label>

        <label class="flex items-start gap-3">
          <input
            type="checkbox"
            class="mt-1 size-4"
            bind:checked={lineShiftEnabled}
            onchange={onSubPrefChange}
            disabled={!enabled}
          />
          <span>
            <span class="font-medium">Line-movement alerts</span>
            <p class="text-sm text-muted-foreground">
              Get notified when the line on a game you've picked moves past your threshold.
            </p>
          </span>
        </label>

        <div class="flex items-center gap-3 pl-7">
          <Label for="threshold" class="text-sm">Alert threshold (points)</Label>
          <Input
            id="threshold"
            type="number"
            min="0.5"
            step="0.5"
            class="w-24"
            bind:value={threshold}
            onchange={onSubPrefChange}
            disabled={!enabled || !lineShiftEnabled}
          />
        </div>
      </div>

      {#if msg}
        <div
          class="rounded-xl border p-3 text-sm"
          class:border-success={msg.kind === 'success'}
          class:border-warning={msg.kind === 'warn'}
          class:border-destructive={msg.kind === 'error'}
        >
          {msg.text}
        </div>
      {/if}
    </CardContent>
  </Card>
</section>

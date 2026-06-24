<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Label } from '$lib/components/ui/label';
  import { Input } from '$lib/components/ui/input';
  import UserAvatar from '$lib/components/UserAvatar.svelte';
  import { AVATAR_PRESETS } from '$lib/avatars';

  type PushClient = typeof import('$lib/push/client');

  let { data }: { data: PageData } = $props();

  const displayName = $derived(data.userProfile?.displayName ?? '');
  let avatarKey = $state<string | null>(data.userProfile?.avatarKey ?? null);
  let avatarMsg = $state<{ kind: 'success' | 'error'; text: string } | null>(null);
  let currentPassword = $state('');
  let newPassword = $state('');
  let confirmPassword = $state('');
  let passwordBusy = $state(false);
  let passwordMsg = $state<{ kind: 'success' | 'error'; text: string } | null>(null);
  const canSubmitPassword = $derived(
    currentPassword.length > 0 &&
      newPassword.length > 0 &&
      confirmPassword.length > 0 &&
      !passwordBusy
  );

  async function selectAvatar(key: string | null) {
    avatarKey = key;
    avatarMsg = null;
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar_key: key })
    });
    avatarMsg = res.ok
      ? { kind: 'success', text: 'Avatar saved.' }
      : { kind: 'error', text: 'Could not save avatar.' };
  }

  async function changePassword() {
    if (passwordBusy) return;
    passwordMsg = null;

    if (newPassword.length < 8) {
      passwordMsg = { kind: 'error', text: 'New password must be at least 8 characters.' };
      return;
    }

    if (newPassword !== confirmPassword) {
      passwordMsg = { kind: 'error', text: 'New passwords do not match.' };
      return;
    }

    passwordBusy = true;
    try {
      const res = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });
      const body = (await res.json().catch(() => ({}))) as { reason?: string };

      if (!res.ok) {
        passwordMsg = {
          kind: 'error',
          text: body.reason ?? 'Could not update password.'
        };
        return;
      }

      currentPassword = '';
      newPassword = '';
      confirmPassword = '';
      passwordMsg = { kind: 'success', text: 'Password updated.' };
    } finally {
      passwordBusy = false;
    }
  }

  let enabled = $state(data.prefs.enabled);
  let pickReminders = $state(data.prefs.pick_reminders);
  let lineShiftEnabled = $state(data.prefs.line_shift.enabled);
  let threshold = $state(data.prefs.line_shift.threshold);

  let supported = $state(true);
  let permission = $state<NotificationPermission | 'unsupported'>('default');
  let busy = $state(false);
  let msg = $state<{ kind: 'success' | 'error' | 'warn'; text: string } | null>(null);
  let pushClient = $state<PushClient | null>(null);

  onMount(async () => {
    try {
      pushClient = await import('$lib/push/client');
      supported = pushClient.isPushSupported();
      permission = pushClient.notificationPermission();
    } catch {
      supported = false;
      permission = 'unsupported';
    }
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
      if (!pushClient) {
        msg = {
          kind: 'warn',
          text: 'This browser/device does not support push notifications.'
        };
        return;
      }

      if (!enabled) {
        const r = await pushClient.subscribeToPush();
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
        await pushClient.unsubscribeFromPush();
        enabled = false;
      }
      permission = pushClient.notificationPermission();
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
      <CardTitle class="text-xl font-bold">Profile</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4 p-0 pt-2">
      <div class="flex items-center gap-3">
        <UserAvatar {avatarKey} {displayName} size="md" />
        <span class="font-medium">{displayName}</span>
      </div>

      <div>
        <p class="mb-2 text-sm text-muted-foreground">Choose an avatar</p>
        <div class="flex flex-wrap gap-2">
          {#each AVATAR_PRESETS as preset (preset.key)}
            <button
              onclick={() => selectAvatar(preset.key)}
              title={preset.key}
              class="flex size-10 items-center justify-center rounded-full text-xl transition-transform hover:scale-110 focus:outline-none"
              class:ring-2={avatarKey === preset.key}
              class:ring-offset-2={avatarKey === preset.key}
              class:ring-foreground={avatarKey === preset.key}
              style="background:{preset.bg};"
            >
              {preset.emoji}
            </button>
          {/each}
          {#if avatarKey !== null}
            <button
              onclick={() => selectAvatar(null)}
              title="Remove avatar"
              class="flex size-10 items-center justify-center rounded-full border text-xs text-muted-foreground transition-transform hover:scale-110 focus:outline-none"
            >
              ✕
            </button>
          {/if}
        </div>
      </div>

      {#if avatarMsg}
        <div
          class="rounded-xl border p-3 text-sm"
          class:border-success={avatarMsg.kind === 'success'}
          class:border-destructive={avatarMsg.kind === 'error'}
        >
          {avatarMsg.text}
        </div>
      {/if}

      <form
        class="space-y-4 border-t pt-4"
        onsubmit={(event) => {
          event.preventDefault();
          void changePassword();
        }}
      >
        <div>
          <h2 class="font-medium">Password</h2>
          <p class="text-sm text-muted-foreground">Update the password for this account.</p>
        </div>

        <div class="space-y-2">
          <Label for="current-password">Current password</Label>
          <Input
            id="current-password"
            name="current-password"
            type="password"
            autocomplete="current-password"
            bind:value={currentPassword}
          />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <Label for="new-password">New password</Label>
            <Input
              id="new-password"
              name="new-password"
              type="password"
              autocomplete="new-password"
              minlength={8}
              bind:value={newPassword}
            />
          </div>
          <div class="space-y-2">
            <Label for="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              name="confirm-password"
              type="password"
              autocomplete="new-password"
              minlength={8}
              bind:value={confirmPassword}
            />
          </div>
        </div>

        <div class="flex justify-end">
          <Button type="submit" disabled={!canSubmitPassword}>
            {passwordBusy ? 'Updating...' : 'Update password'}
          </Button>
        </div>

        {#if passwordMsg}
          <div
            class="rounded-xl border p-3 text-sm"
            class:border-success={passwordMsg.kind === 'success'}
            class:border-destructive={passwordMsg.kind === 'error'}
          >
            {passwordMsg.text}
          </div>
        {/if}
      </form>
    </CardContent>
  </Card>

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

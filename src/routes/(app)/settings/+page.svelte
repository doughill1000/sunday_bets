<script lang="ts">
  import { onMount } from 'svelte';
  import { invalidateAll } from '$app/navigation';
  import type { PageData } from './$types';
  import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Label } from '$lib/components/ui/label';
  import { Input } from '$lib/components/ui/input';
  import UserAvatar from '$lib/components/UserAvatar.svelte';
  import FormNote from '$lib/components/FormNote.svelte';
  import { AVATAR_PRESETS } from '$lib/avatars';
  import { THEME_MODES, DEFAULT_THEME_MODE, applyThemeMode, type ThemeMode } from '$lib/theme';

  type PushClient = typeof import('$lib/push/client');

  let { data }: { data: PageData } = $props();

  const displayName = $derived(data.userProfile?.displayName ?? '');
  let displayNameInput = $state(data.userProfile?.displayName ?? '');
  let displayNameBusy = $state(false);
  let displayNameMsg = $state<{ kind: 'success' | 'error'; text: string } | null>(null);
  const canSubmitDisplayName = $derived(
    displayNameInput.trim().length > 0 &&
      displayNameInput.trim().length <= 40 &&
      displayNameInput.trim() !== displayName &&
      !displayNameBusy
  );

  let avatarKey = $state<string | null>(data.userProfile?.avatarKey ?? null);
  let isChampion = $state(false);
  $effect(() => {
    void data.championUserId?.then((champId) => {
      isChampion = champId != null && champId === data.user?.id;
    });
  });
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

  async function saveDisplayName() {
    if (displayNameBusy) return;
    displayNameMsg = null;
    const trimmed = displayNameInput.trim();
    if (trimmed.length === 0) {
      displayNameMsg = { kind: 'error', text: 'Display name cannot be blank.' };
      return;
    }
    if (trimmed.length > 40) {
      displayNameMsg = { kind: 'error', text: 'Display name must be 40 characters or fewer.' };
      return;
    }
    displayNameBusy = true;
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: trimmed })
      });
      const body = (await res.json().catch(() => ({}))) as { reason?: string };
      if (!res.ok) {
        displayNameMsg = { kind: 'error', text: body.reason ?? 'Could not save display name.' };
        return;
      }
      displayNameInput = trimmed;
      displayNameMsg = { kind: 'success', text: 'Display name saved.' };
      await invalidateAll();
    } finally {
      displayNameBusy = false;
    }
  }

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

  // Roving-tabindex arrow nav for the avatar radiogroup, matching ChipRadiogroup's pattern.
  function onAvatarKeydown(event: KeyboardEvent) {
    const index = AVATAR_PRESETS.findIndex((p) => p.key === avatarKey);
    if (AVATAR_PRESETS.length === 0) return;

    let next = index;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = index < 0 ? 0 : (index + 1) % AVATAR_PRESETS.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next =
          index < 0
            ? AVATAR_PRESETS.length - 1
            : (index - 1 + AVATAR_PRESETS.length) % AVATAR_PRESETS.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = AVATAR_PRESETS.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextKey = AVATAR_PRESETS[next].key;
    void selectAvatar(nextKey);
    document.getElementById(`avatar-${nextKey}`)?.focus();
  }

  // Pick-card ATS trend nugget preference (issue #406). bind:checked updates the state before
  // onchange fires, so `showTeamTrends` already holds the new value here.
  let showTeamTrends = $state(data.userProfile?.showTeamTrends ?? true);
  let trendsMsg = $state<{ kind: 'success' | 'error'; text: string } | null>(null);

  async function saveShowTeamTrends() {
    trendsMsg = null;
    const next = showTeamTrends;
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ show_team_trends: next })
    });
    if (!res.ok) {
      showTeamTrends = !next; // revert the optimistic toggle
      trendsMsg = { kind: 'error', text: 'Could not save preference.' };
      return;
    }
    trendsMsg = { kind: 'success', text: 'Preference saved.' };
    // Refresh the cached profile so /picks reflects the change on next navigation.
    await invalidateAll();
  }

  // Theme preference (issue #532). Applies the new theme to <html> immediately so the
  // switch is instant, then persists to /api/profile and refreshes the cached profile.
  const THEME_LABELS: Record<ThemeMode, string> = {
    dark: 'Dark',
    light: 'Light',
    system: 'System'
  };
  let themePref = $state<ThemeMode>(data.userProfile?.themePref ?? DEFAULT_THEME_MODE);
  let themeMsg = $state<{ kind: 'success' | 'error'; text: string } | null>(null);

  async function selectTheme(mode: ThemeMode) {
    if (mode === themePref) return;
    const prev = themePref;
    themePref = mode;
    applyThemeMode(mode); // instant, ahead of the round-trip
    themeMsg = null;
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme_pref: mode })
    });
    if (!res.ok) {
      themePref = prev;
      applyThemeMode(prev); // revert the live theme too
      themeMsg = { kind: 'error', text: 'Could not save theme.' };
      return;
    }
    themeMsg = { kind: 'success', text: 'Theme saved.' };
    // Refresh the cached profile so the SSR class + toaster theme match on next load.
    await invalidateAll();
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

  // Sign-in methods
  const PROVIDER_LABELS: Record<string, string> = {
    email: 'Email / Password',
    google: 'Google'
  };

  // Providers the user can actively connect (OAuth only — email is implicit).
  const LINKABLE_PROVIDERS = ['google'] as const;

  let identities = $state(data.identities);
  let identityBusy = $state<string | null>(null); // identity_id currently being removed
  let linkBusy = $state<string | null>(null); // provider currently being linked
  let identityMsg = $state<{ kind: 'success' | 'error'; text: string } | null>(null);

  function hasProvider(provider: string) {
    return identities.some((i) => i.provider === provider);
  }

  async function unlinkIdentity(identityId: string) {
    identityBusy = identityId;
    identityMsg = null;
    try {
      const res = await fetch('/api/profile/identities', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity_id: identityId })
      });
      const body = (await res.json().catch(() => ({}))) as { reason?: string };
      if (!res.ok) {
        identityMsg = { kind: 'error', text: body.reason ?? 'Could not disconnect method.' };
        return;
      }
      await invalidateAll();
      identities = data.identities;
      identityMsg = { kind: 'success', text: 'Sign-in method disconnected.' };
    } finally {
      identityBusy = null;
    }
  }

  async function linkProvider(provider: (typeof LINKABLE_PROVIDERS)[number]) {
    linkBusy = provider;
    identityMsg = null;
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=/settings`;
      const { error } = await data.supabase.auth.linkIdentity({
        provider,
        options: { redirectTo }
      });
      if (error) {
        identityMsg = { kind: 'error', text: error.message };
        linkBusy = null;
      }
      // On success the browser navigates to the OAuth provider — no further handling needed here.
    } catch {
      identityMsg = { kind: 'error', text: 'Could not start the link flow. Try again.' };
      linkBusy = null;
    }
  }

  let enabled = $state(data.prefs.enabled);
  let pickReminders = $state(data.prefs.pick_reminders);
  let resultsRecap = $state(data.prefs.results_recap);
  let aiRecap = $state(data.prefs.ai_recap);
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
        results_recap: resultsRecap,
        ai_recap: aiRecap,
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

  // ── League (#660) ─────────────────────────────────────────────────────────
  // The two personal league knobs, moved here from /league/manage when that page became a
  // commissioner-only console. They belong next to Notifications' own "Recap ready" toggle:
  // same shape — per-user preferences, not league administration.

  // Per-player AI recap opt-out (issue #301, ADR-0008).
  let aiRecapOptOut = $state(data.aiRecapOptOut);
  let optOutMsg = $state<{ kind: 'success' | 'error'; text: string } | null>(null);
  let optOutBusy = $state(false);

  let leaveBusy = $state(false);
  let leaveMsg = $state<{ kind: 'success' | 'error'; text: string } | null>(null);

  async function toggleOptOut(optOut: boolean) {
    if (optOutBusy) return;
    optOutMsg = null;
    optOutBusy = true;
    try {
      const res = await fetch('/api/group/recap-opt-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_recap_opt_out: optOut })
      });
      const body = (await res.json().catch(() => ({}))) as { reason?: string };
      if (!res.ok) {
        optOutMsg = { kind: 'error', text: body.reason ?? 'Could not update recap preference.' };
        aiRecapOptOut = !optOut; // revert the optimistic toggle
        return;
      }
      optOutMsg = {
        kind: 'success',
        text: optOut ? "Opted out — you'll appear as neutral facts." : 'Opted back in.'
      };
    } finally {
      optOutBusy = false;
    }
  }

  async function leaveLeague() {
    if (leaveBusy) return;
    leaveBusy = true;
    leaveMsg = null;
    try {
      const res = await fetch('/api/group/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const body = (await res.json().catch(() => ({}))) as { reason?: string };
      if (!res.ok) {
        leaveMsg = { kind: 'error', text: body.reason ?? 'Could not leave league.' };
        return;
      }
      // Full document load, not a client nav: leaving invalidates the active-group cookie and
      // every cached group query, so hooks.server.ts must re-resolve the group from scratch.
      window.location.href = '/join';
    } finally {
      leaveBusy = false;
    }
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
        <UserAvatar {avatarKey} {displayName} size="md" champion={isChampion} />
        <span class="font-medium">{displayName}</span>
      </div>

      <form
        class="space-y-2"
        onsubmit={(e) => {
          e.preventDefault();
          void saveDisplayName();
        }}
      >
        <Label for="display-name">Display name</Label>
        <div class="flex gap-2">
          <Input
            id="display-name"
            name="display-name"
            type="text"
            maxlength={40}
            autocomplete="nickname"
            bind:value={displayNameInput}
          />
          <Button type="submit" disabled={!canSubmitDisplayName}>
            {displayNameBusy ? 'Saving…' : 'Save'}
          </Button>
        </div>
        {#if displayNameMsg}
          <div
            class="rounded-xl border p-3 text-sm"
            class:border-success={displayNameMsg.kind === 'success'}
            class:border-destructive={displayNameMsg.kind === 'error'}
          >
            {displayNameMsg.text}
          </div>
        {/if}
      </form>

      <div>
        <p class="mb-2 text-sm text-muted-foreground" id="avatar-picker-label">Choose an avatar</p>
        <div class="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="avatar-picker-label">
          {#each AVATAR_PRESETS as preset, i (preset.key)}
            <button
              type="button"
              id={`avatar-${preset.key}`}
              role="radio"
              aria-checked={avatarKey === preset.key}
              tabindex={avatarKey === preset.key || (avatarKey === null && i === 0) ? 0 : -1}
              onclick={() => selectAvatar(preset.key)}
              onkeydown={onAvatarKeydown}
              title={preset.key}
              class="flex size-10 items-center justify-center rounded-full text-xl transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
              type="button"
              onclick={() => selectAvatar(null)}
              title="Remove avatar"
              class="flex size-10 items-center justify-center rounded-full border text-xs text-muted-foreground transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
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

      {#if hasProvider('email')}
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
      {/if}
    </CardContent>
  </Card>

  <Card class="p-6">
    <CardHeader class="mb-2 p-0">
      <CardTitle class="text-xl font-bold">Appearance</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4 p-0 pt-2">
      <div>
        <p class="font-medium">Theme</p>
        <p class="text-sm text-muted-foreground">
          Pick a light or dark look, or follow your device setting.
        </p>
      </div>

      <div role="radiogroup" aria-label="Theme" class="flex gap-2">
        {#each THEME_MODES as mode (mode)}
          <button
            type="button"
            role="radio"
            aria-checked={themePref === mode}
            onclick={() => selectTheme(mode)}
            class="flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors {themePref ===
            mode
              ? 'border-primary-ink bg-primary text-primary-foreground'
              : 'border-border hover:border-primary-ink'}"
          >
            {THEME_LABELS[mode]}
          </button>
        {/each}
      </div>

      {#if themeMsg}
        <div
          class="rounded-xl border p-3 text-sm"
          class:border-success={themeMsg.kind === 'success'}
          class:border-destructive={themeMsg.kind === 'error'}
        >
          {themeMsg.text}
        </div>
      {/if}
    </CardContent>
  </Card>

  <Card class="p-6">
    <CardHeader class="mb-2 p-0">
      <CardTitle class="text-xl font-bold">Picks</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4 p-0 pt-2">
      <label class="flex items-start gap-3">
        <input
          type="checkbox"
          class="mt-1 size-4"
          bind:checked={showTeamTrends}
          onchange={saveShowTeamTrends}
        />
        <span>
          <span class="font-medium">Show team trends on picks</span>
          <p class="text-sm text-muted-foreground">
            Adds a muted line per team on each pick card with that team's record against the spread
            in this game's exact situation (home/away, favorite/underdog). Turn off for a cleaner
            card.
          </p>
        </span>
      </label>

      {#if trendsMsg}
        <div
          class="rounded-xl border p-3 text-sm"
          class:border-success={trendsMsg.kind === 'success'}
          class:border-destructive={trendsMsg.kind === 'error'}
        >
          {trendsMsg.text}
        </div>
      {/if}
    </CardContent>
  </Card>

  <Card class="p-6">
    <CardHeader class="mb-2 p-0">
      <CardTitle class="text-xl font-bold">Sign-in methods</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4 p-0 pt-2">
      <p class="text-sm text-muted-foreground">
        Manage how you sign in. You must keep at least one method connected.
      </p>

      <ul class="space-y-3" aria-label="Connected sign-in methods">
        {#each identities as identity (identity.identity_id)}
          <li class="flex items-center justify-between gap-4 rounded-lg border p-3">
            <span class="font-medium">
              {PROVIDER_LABELS[identity.provider] ?? identity.provider}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={identities.length <= 1 || identityBusy === identity.identity_id}
              onclick={() => void unlinkIdentity(identity.identity_id)}
              aria-label="Disconnect {PROVIDER_LABELS[identity.provider] ?? identity.provider}"
            >
              {identityBusy === identity.identity_id ? 'Disconnecting…' : 'Disconnect'}
            </Button>
          </li>
        {/each}
      </ul>

      {#if identities.length <= 1}
        <p class="text-sm text-muted-foreground">
          Connect another sign-in method before disconnecting this one.
        </p>
      {/if}

      <div class="space-y-2 border-t pt-3">
        <p class="text-sm font-medium">Connect a new method</p>
        {#each LINKABLE_PROVIDERS as provider (provider)}
          {#if !hasProvider(provider)}
            <Button
              variant="outline"
              disabled={linkBusy === provider}
              onclick={() => void linkProvider(provider)}
              aria-label="Connect with {PROVIDER_LABELS[provider]}"
            >
              {linkBusy === provider ? 'Redirecting…' : `Connect with ${PROVIDER_LABELS[provider]}`}
            </Button>
          {/if}
        {/each}
        {#if LINKABLE_PROVIDERS.every((p) => hasProvider(p))}
          <p class="text-sm text-muted-foreground">All available sign-in methods are connected.</p>
        {/if}
      </div>

      {#if identityMsg}
        <div
          class="rounded-xl border p-3 text-sm"
          class:border-success={identityMsg.kind === 'success'}
          class:border-destructive={identityMsg.kind === 'error'}
        >
          {identityMsg.text}
        </div>
      {/if}
    </CardContent>
  </Card>

  <Card class="p-6">
    <CardHeader class="mb-2 p-0">
      <CardTitle class="text-xl font-bold">Notifications</CardTitle>
    </CardHeader>
    <CardContent class="space-y-5 p-0 pt-2">
      {#if !supported}
        <div class="rounded-xl border border-warning p-3 text-sm">
          This browser doesn't support push notifications. On iPhone, add Hotshot to your Home
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
            bind:checked={resultsRecap}
            onchange={onSubPrefChange}
            disabled={!enabled}
          />
          <span>
            <span class="font-medium">Results recap</span>
            <p class="text-sm text-muted-foreground">
              A summary of your record and points once the week is fully graded.
            </p>
          </span>
        </label>

        <label class="flex items-start gap-3">
          <input
            type="checkbox"
            class="mt-1 size-4"
            bind:checked={aiRecap}
            onchange={onSubPrefChange}
            disabled={!enabled}
          />
          <span>
            <span class="font-medium">Recap ready</span>
            <p class="text-sm text-muted-foreground">
              A push when your league's AI recap is ready to read.
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

  <!-- League (#660): the personal knobs for the league you're in — NOT league administration,
       which is the commissioner's console at /league/manage. Sits last, directly under
       Notifications, because the recap opt-out is the sibling of that card's "Recap ready"
       toggle. Renders only when an active league resolved. -->
  {#if data.leagueName}
    <Card class="p-6">
      <CardHeader class="mb-2 p-0">
        <CardTitle class="text-xl font-bold">League</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4 p-0 pt-2">
        <p class="font-medium">{data.leagueName}</p>

        <label class="flex items-start gap-3">
          <input
            type="checkbox"
            class="mt-1 size-4"
            checked={!aiRecapOptOut}
            disabled={optOutBusy}
            onchange={(e) => {
              const optOut = !e.currentTarget.checked;
              aiRecapOptOut = optOut;
              void toggleOptOut(optOut);
            }}
          />
          <span>
            <span class="font-medium">Include me in the AI recap</span>
            <p class="text-sm text-muted-foreground">
              When on, you may appear in the weekly recap with personalised commentary. When off,
              you'll show up only as neutral facts — wins, losses, points.
            </p>
          </span>
        </label>

        {#if optOutMsg}
          <FormNote kind={optOutMsg.kind} text={optOutMsg.text} />
        {/if}

        <div class="space-y-3 border-t pt-4">
          <div>
            <p class="font-medium">Leave league</p>
            {#if data.isLastCommissioner}
              <p class="text-sm text-muted-foreground">
                You are the only commissioner. Promote another member to commissioner before
                leaving.
              </p>
            {:else}
              <p class="text-sm text-muted-foreground">
                You will lose access to this league's picks and standings.
              </p>
            {/if}
          </div>

          <Button
            variant="destructive"
            disabled={data.isLastCommissioner || leaveBusy}
            onclick={() => {
              if (confirm('Leave this league? You will lose access to picks and standings.')) {
                void leaveLeague();
              }
            }}
          >
            {leaveBusy ? 'Leaving…' : 'Leave league'}
          </Button>

          {#if leaveMsg}
            <FormNote kind={leaveMsg.kind} text={leaveMsg.text} />
          {/if}
        </div>
      </CardContent>
    </Card>
  {/if}
</section>

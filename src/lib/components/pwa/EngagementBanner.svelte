<script lang="ts">
  import { onMount } from 'svelte';
  import type { User } from '@supabase/supabase-js';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent } from '$lib/components/ui/card';
  import { X, Bell, Download, Smartphone, SquareArrowUp } from '@lucide/svelte';
  import { chooseInstallStep, chooseNotifStep, type EngagementStep } from '$lib/pwa/engagement';
  import {
    isStandalone,
    isIos,
    isInstallDismissed,
    dismissInstall,
    isNotifDismissed,
    dismissNotif
  } from '$lib/pwa/client';
  import { installStore } from '$lib/pwa/install.svelte';
  import {
    isPushSupported,
    notificationPermission,
    hasPushSubscription,
    subscribeToPush
  } from '$lib/push/client';

  interface Props {
    user: User | null;
  }

  let { user }: Props = $props();

  let step = $state<EngagementStep>('none');
  let subscribing = $state(false);

  async function computeStep() {
    // Resolve the install decision synchronously first — it needs no async data,
    // so it can render immediately at mount instead of waiting on the
    // hasPushSubscription() check below that only the notification branch needs.
    const installStep = chooseInstallStep({
      isStandalone: isStandalone(),
      isIos: isIos(),
      canInstall: installStore.canInstall,
      installDismissed: isInstallDismissed()
    });
    if (installStep !== null) {
      step = installStep;
      return;
    }

    step = chooseNotifStep({
      pushSupported: isPushSupported(),
      notifPermission: notificationPermission(),
      hasSubscription: await hasPushSubscription(),
      notifDismissed: isNotifDismissed()
    });
  }

  onMount(() => {
    if (user) computeStep();
  });

  async function handleInstall() {
    await installStore.promptInstall();
    await computeStep();
  }

  function handleInstallDismiss() {
    dismissInstall();
    computeStep();
  }

  async function handleEnableNotif() {
    subscribing = true;
    await subscribeToPush();
    subscribing = false;
    await computeStep();
  }

  function handleNotifDismiss() {
    dismissNotif();
    computeStep();
  }
</script>

{#if user && step !== 'none'}
  <Card class="mb-4 border-primary-ink/20 bg-primary/5 shadow-elevation-popover">
    <CardContent class="flex items-start gap-3 p-4">
      {#if step === 'install-ios'}
        <Smartphone class="mt-0.5 size-5 shrink-0 text-primary-ink" />
        <div class="flex-1">
          <p class="text-sm font-medium">Add Hotshot to your Home Screen</p>
          <p class="mt-0.5 text-xs text-muted-foreground">
            Tap <strong class="whitespace-nowrap"
              >Share <SquareArrowUp
                class="inline size-3.5 align-text-bottom"
                aria-hidden="true"
              /></strong
            >
            → <strong>Add to Home Screen</strong> in Safari. Requires iOS 16.4+ for push notifications.
          </p>
        </div>
        <button
          onclick={handleInstallDismiss}
          aria-label="Dismiss"
          class="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X class="size-4" />
        </button>
      {:else if step === 'install-prompt'}
        <Download class="mt-0.5 size-5 shrink-0 text-primary-ink" />
        <div class="flex-1">
          <p class="text-sm font-medium">Install Hotshot</p>
          <p class="mt-0.5 text-xs text-muted-foreground">
            Get the full app experience — faster loads and push notifications.
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <Button size="sm" onclick={handleInstall}>Install</Button>
          <button
            onclick={handleInstallDismiss}
            aria-label="Dismiss"
            class="text-muted-foreground hover:text-foreground"
          >
            <X class="size-4" />
          </button>
        </div>
      {:else if step === 'notif-enable'}
        <Bell class="mt-0.5 size-5 shrink-0 text-primary-ink" />
        <div class="flex-1">
          <p class="text-sm font-medium">Enable push notifications</p>
          <p class="mt-0.5 text-xs text-muted-foreground">
            Get reminders before games lock so you never miss a pick.
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <Button size="sm" onclick={handleEnableNotif} disabled={subscribing}>
            {subscribing ? 'Enabling…' : 'Enable'}
          </Button>
          <button
            onclick={handleNotifDismiss}
            aria-label="Dismiss"
            class="text-muted-foreground hover:text-foreground"
          >
            <X class="size-4" />
          </button>
        </div>
      {:else if step === 'notif-denied'}
        <Bell class="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div class="flex-1">
          <p class="text-sm font-medium">Notifications are blocked</p>
          <p class="mt-0.5 text-xs text-muted-foreground">
            Re-enable them in your browser or device settings, or manage preferences in
            <a href="/settings" class="underline">Settings</a>.
          </p>
        </div>
        <button
          onclick={handleNotifDismiss}
          aria-label="Dismiss"
          class="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X class="size-4" />
        </button>
      {/if}
    </CardContent>
  </Card>
{/if}

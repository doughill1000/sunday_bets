<script lang="ts">
  import { untrack } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import { page } from '$app/state';
  import { invalidateAll } from '$app/navigation';
  import type { User } from '@supabase/supabase-js';

  import { Dialog, DialogContent, DialogHeader, DialogTitle } from '$lib/components/ui/dialog';
  import { Sheet, SheetContent, SheetHeader, SheetTitle } from '$lib/components/ui/sheet';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import HowToPlay from './HowToPlay.svelte';
  import { shouldAutoOpenGuide } from './guide.js';

  interface Props {
    guideSeenAt: string | null;
    user: User | null;
    displayName?: string;
  }

  let { guideSeenAt, user, displayName = '' }: Props = $props();

  const isDesktop = new MediaQuery('(min-width: 640px)');

  let open = $state(
    untrack(() => shouldAutoOpenGuide({ guideSeenAt, pathname: page.url.pathname }))
  );

  // First-run name confirmation. Email signups inherit their email local-part as the
  // display name friends see on the leaderboard; this is the one moment to pick a friendly
  // one. Prefilled with the current name; only written if the user actually changes it.
  const MAX_NAME = 40;
  const initialName = untrack(() => displayName);
  let name = $state(untrack(() => displayName));
  let nameError = $state<string | null>(null);
  let saving = $state(false);

  // Guard against re-entrancy: setting `open = false` fires onOpenChange, which would
  // otherwise run the dismiss path a second time.
  async function finishDismiss() {
    open = false;
    if (!user) return;
    await fetch('/api/profile/guide-seen', { method: 'POST' });
    await invalidateAll();
  }

  /** Save the display name only if it changed. Returns false (and sets nameError) on a
   *  validation/save failure so the caller can keep the guide open. */
  async function saveNameIfChanged(): Promise<boolean> {
    if (!user) return true;
    const trimmed = name.trim();
    if (trimmed === initialName.trim()) return true; // unchanged → nothing to write
    if (trimmed.length === 0) {
      nameError = 'Enter a name, or skip for now.';
      return false;
    }
    if (trimmed.length > MAX_NAME) {
      nameError = `Name must be ${MAX_NAME} characters or fewer.`;
      return false;
    }
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: trimmed })
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { reason?: string };
      nameError = body.reason ?? 'Could not save your name.';
      return false;
    }
    return true;
  }

  // "Got it": confirm the name (save if changed) then close. On a name error, stay open.
  async function confirmAndDismiss() {
    if (!open || saving) return;
    saving = true;
    try {
      if (!(await saveNameIfChanged())) return;
      await finishDismiss();
    } finally {
      saving = false;
    }
  }

  // "Skip for now" / outside-click / ESC: close without touching the name.
  function skipAndDismiss() {
    if (!open || saving) return;
    void finishDismiss();
  }

  function handleOpenChange(v: boolean) {
    if (!v) skipAndDismiss();
  }
</script>

{#snippet nameField()}
  <div class="mb-4 space-y-2 border-b pb-4">
    <Label for="welcome-name">Your name</Label>
    <p class="text-xs text-muted-foreground">This is how you'll show up on the leaderboard.</p>
    <Input
      id="welcome-name"
      bind:value={name}
      maxlength={MAX_NAME}
      autocomplete="name"
      placeholder="Your name"
      disabled={saving}
      oninput={() => (nameError = null)}
    />
    {#if nameError}
      <p class="text-xs text-destructive">{nameError}</p>
    {/if}
  </div>
{/snippet}

{#if isDesktop.current}
  <Dialog bind:open onOpenChange={handleOpenChange}>
    <DialogContent data-testid="welcome-guide" class="flex max-h-[85vh] max-w-lg flex-col">
      <DialogHeader>
        <DialogTitle class="text-2xl">How to Play</DialogTitle>
      </DialogHeader>
      <div class="min-h-0 overflow-y-auto">
        {@render nameField()}
        <HowToPlay />
      </div>
      <div class="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" size="sm" onclick={skipAndDismiss} disabled={saving}>
          Skip for now
        </Button>
        <Button data-testid="guide-dismiss" onclick={confirmAndDismiss} disabled={saving}>
          {saving ? 'Saving…' : 'Got it'}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
{:else}
  <Sheet bind:open onOpenChange={handleOpenChange}>
    <SheetContent data-testid="welcome-guide" side="bottom" class="max-h-[90vh] rounded-t-xl pb-8">
      <SheetHeader class="pb-4">
        <SheetTitle class="text-2xl">How to Play</SheetTitle>
      </SheetHeader>
      <div class="min-h-0 flex-1 overflow-y-auto px-4">
        {@render nameField()}
        <HowToPlay />
      </div>
      <div class="flex flex-col gap-2 px-4 pt-4">
        <Button data-testid="guide-dismiss" onclick={confirmAndDismiss} disabled={saving}>
          {saving ? 'Saving…' : 'Got it'}
        </Button>
        <Button variant="ghost" onclick={skipAndDismiss} disabled={saving}>Skip for now</Button>
      </div>
    </SheetContent>
  </Sheet>
{/if}

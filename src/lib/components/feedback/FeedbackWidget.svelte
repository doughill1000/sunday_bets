<script lang="ts">
  import { page } from '$app/state';
  import { MessageSquarePlus } from '@lucide/svelte';
  import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription
  } from '$lib/components/ui/sheet';
  import { Button } from '$lib/components/ui/button';
  import ChipRadiogroup from '$lib/components/stats/ChipRadiogroup.svelte';
  import { toast } from 'svelte-sonner';
  import { feedbackOpen } from '$lib/feedback/store';
  import { buildFeedbackContext, type FeedbackKind } from '$lib/feedback/context';

  interface Props {
    /** Active group id, stamped into the capture context (null if none). */
    groupId?: string | null;
  }
  let { groupId = null }: Props = $props();

  const KINDS: { code: FeedbackKind; label: string }[] = [
    { code: 'bug', label: '🐛 Bug' },
    { code: 'idea', label: '💡 Idea' },
    { code: 'confused', label: '😕 Confused' },
    { code: 'love', label: '🔥 Love it' }
  ];

  // The kind picker is the canonical chip radiogroup (roving tabindex + arrow keys + focus
  // ring), the same control /stats and /league use — not a hand-rolled radiogroup (audit S7).
  const KIND_OPTIONS = KINDS.map((k) => ({ value: k.code, label: k.label }));

  const MAX_BODY = 4000;

  let kind = $state<FeedbackKind>('idea');
  let body = $state('');
  let submitting = $state(false);

  function reset() {
    body = '';
    kind = 'idea';
    submitting = false;
  }

  function onOpenChange(value: boolean) {
    feedbackOpen.set(value);
    if (!value) reset();
  }

  async function submit() {
    const trimmed = body.trim();
    if (!trimmed || submitting) return;
    submitting = true;
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          body: trimmed,
          kind,
          context: buildFeedbackContext({ route: page.url.pathname, groupId })
        })
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (res.ok && data.ok) {
        toast.success('Got it — thanks. 🔥');
        feedbackOpen.set(false);
        reset();
      } else {
        toast.error(data.reason ?? 'Could not send — try again.');
        submitting = false;
      }
    } catch {
      // Network/offline: never crash the app, just surface it (ADR-0028).
      toast.error('You seem to be offline — try again in a sec.');
      submitting = false;
    }
  }
</script>

<!-- Persistent floating entry point on authed app routes. Sits above the mobile
     bottom tab bar (bottom-20) and clears it on desktop (sm:bottom-6). -->
<button
  type="button"
  data-testid="feedback-open"
  class="fixed right-4 bottom-20 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:brightness-110 sm:bottom-6"
  aria-label="Send feedback"
  onclick={() => feedbackOpen.set(true)}
>
  <MessageSquarePlus class="h-5 w-5" />
</button>

<Sheet open={$feedbackOpen} {onOpenChange}>
  <SheetContent side="bottom" class="rounded-t-xl pb-8" data-testid="feedback-sheet">
    <SheetHeader class="pb-2 text-left">
      <SheetTitle>Spotted something?</SheetTitle>
      <SheetDescription>
        Bug, idea, or just a reaction — tell us. We attach a few technical details to help us fix
        it.
      </SheetDescription>
    </SheetHeader>

    <div class="flex flex-col gap-3 px-4">
      <ChipRadiogroup
        options={KIND_OPTIONS}
        value={kind}
        ariaLabel="Feedback type"
        idPrefix="feedback-kind"
        onchange={(value) => (kind = value as FeedbackKind)}
      />

      <textarea
        bind:value={body}
        data-testid="feedback-body"
        rows="4"
        maxlength={MAX_BODY}
        placeholder="What happened, or what would make this better?"
        class="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
      ></textarea>

      <Button data-testid="feedback-submit" onclick={submit} disabled={!body.trim() || submitting}>
        {submitting ? 'Sending…' : 'Send feedback'}
      </Button>
    </div>
  </SheetContent>
</Sheet>

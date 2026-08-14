<script lang="ts">
  import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent
  } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { testPushMessage } from '$lib/domain/notifications';

  interface Props {
    onNote?: (kind: 'success' | 'warn' | 'error', text: string) => void;
  }
  let { onNote }: Props = $props();

  let sending = $state(false);

  function note(kind: 'success' | 'warn' | 'error', text: string) {
    onNote?.(kind, text);
  }

  async function sendTest() {
    sending = true;
    try {
      const res = await fetch('/api/push/test', { method: 'POST' });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        sent?: number;
        total?: number;
        pruned?: number;
        reason?: string;
      };
      if (!res.ok || !body.ok) {
        note('error', body.reason ?? 'Failed to send test notification.');
        return;
      }
      // The verdict is a pure rule (#815) so the two zero-delivery cases — no
      // subscriptions vs. subscriptions that all failed — stay unit-tested.
      const verdict = testPushMessage({
        sent: body.sent ?? 0,
        total: body.total ?? 0,
        pruned: body.pruned ?? 0
      });
      note(verdict.kind, verdict.text);
    } catch (e) {
      note('error', e instanceof Error ? e.message : 'Unknown error.');
    } finally {
      sending = false;
    }
  }
</script>

<Card class="p-6">
  <CardHeader class="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
    <CardTitle class="text-xl font-bold">Admin • Test Notification</CardTitle>
    <CardDescription class="text-sm text-muted-foreground">Sends a push to yourself</CardDescription
    >
  </CardHeader>
  <CardContent>
    <div class="flex items-center gap-3">
      <Button variant="default" onclick={sendTest} disabled={sending}>
        {#if sending}Sending…{:else}Send Test Notification{/if}
      </Button>
    </div>
  </CardContent>
</Card>

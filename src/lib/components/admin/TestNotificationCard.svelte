<script lang="ts">
  import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';

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
        pruned?: number;
        reason?: string;
      };
      if (!res.ok || !body.ok) {
        note('error', body.reason ?? 'Failed to send test notification.');
        return;
      }
      if ((body.sent ?? 0) === 0) {
        note('warn', 'No active subscriptions — enable notifications on this device first.');
      } else {
        note('success', `Sent test to ${body.sent} subscription(s).`);
      }
    } catch (e) {
      note('error', e instanceof Error ? e.message : 'Unknown error.');
    } finally {
      sending = false;
    }
  }
</script>

<Card class="p-6">
  <CardHeader class="mb-4 flex items-center justify-between">
    <CardTitle class="text-xl font-bold">Admin • Test Notification</CardTitle>
    <CardDescription class="text-sm text-muted-foreground">Sends a push to yourself</CardDescription>
  </CardHeader>
  <CardContent>
    <div class="flex items-center gap-3">
      <Button variant="default" onclick={sendTest} disabled={sending}>
        {#if sending}Sending…{:else}Send Test Notification{/if}
      </Button>
    </div>
  </CardContent>
</Card>

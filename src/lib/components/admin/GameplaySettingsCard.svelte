<script lang="ts">
  import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import FormNote from '$lib/components/FormNote.svelte';
  import { updateFinalWeekAllin } from '$lib/api/admin/settings';

  interface Props {
    finalWeekUnlimitedAllin: boolean;
  }
  let { finalWeekUnlimitedAllin: initialEnabled }: Props = $props();

  let enabled = $state(initialEnabled);
  let saving = $state(false);
  let msg: { kind: 'success' | 'warn' | 'error'; text: string } | null = $state(null);

  async function toggle() {
    const next = !enabled;
    saving = true;
    try {
      await updateFinalWeekAllin(next);
      enabled = next;
      msg = {
        kind: 'success',
        text: `Final-week All-In exception ${next ? 'enabled' : 'disabled'}.`
      };
    } catch (err) {
      const e = err as { message?: string };
      msg = { kind: 'error', text: e.message ?? 'Failed to update setting.' };
    } finally {
      saving = false;
    }
  }
</script>

<Card class="p-6">
  <CardHeader class="mb-4">
    <CardTitle class="text-xl font-bold">Gameplay Settings</CardTitle>
  </CardHeader>
  <CardContent>
    <div class="flex items-start justify-between gap-6">
      <div>
        <p class="text-sm font-medium">Unlimited All-In in final week</p>
        <p class="mt-1 text-xs text-muted-foreground">
          When enabled, players may use All-In on multiple games during the season's last week. When
          disabled, the one-All-In-per-week limit applies in every week.
        </p>
      </div>
      <Button
        variant={enabled ? 'default' : 'outline'}
        onclick={toggle}
        disabled={saving}
        class="shrink-0"
      >
        {enabled ? 'On' : 'Off'}
      </Button>
    </div>

    {#if msg}
      <FormNote kind={msg.kind === 'warn' ? 'warning' : msg.kind} text={msg.text} class="mt-4" />
    {/if}
  </CardContent>
</Card>

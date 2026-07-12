<script lang="ts">
  import { enhance } from '$app/forms';

  import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent
  } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Button } from '$lib/components/ui/button';
  import FormNote from '$lib/components/FormNote.svelte';
  import CircleCheck from '@lucide/svelte/icons/circle-check';

  let password = $state('');
  let submitting = $state(false);
  // A successful update used to redirect to /picks silently; it now shows a durable
  // confirmation (audit S4, DESIGN.md principle 10) before the user moves on.
  let updated = $state(false);
  let resetNote = $state<{ kind: 'error'; text: string } | null>(null);
</script>

<div class="grid place-items-center">
  <Card
    class="relative z-10 w-full max-w-md rounded-2xl border border-border/60 bg-card/90 shadow-2xl backdrop-blur-xl"
  >
    {#if updated}
      <CardHeader class="items-center space-y-2 text-center">
        <CircleCheck class="h-10 w-10 text-success" aria-hidden="true" />
        <CardTitle class="text-3xl" data-testid="reset-success-title">Password updated</CardTitle>
        <CardDescription>Your password has been changed — you're signed in.</CardDescription>
      </CardHeader>

      <CardContent>
        <Button href="/picks" class="w-full" data-testid="reset-continue">Continue to picks</Button>
      </CardContent>
    {:else}
      <CardHeader class="space-y-1">
        <CardTitle class="text-3xl" data-testid="reset-card-title">Set new password</CardTitle>
        <CardDescription>Choose a password for your account.</CardDescription>
      </CardHeader>

      <CardContent>
        <form
          method="POST"
          use:enhance={() => {
            submitting = true;
            resetNote = null;
            return async ({ result, update }) => {
              submitting = false;
              if (result.type === 'failure') {
                resetNote = {
                  kind: 'error',
                  text: String(result.data?.message ?? 'Could not update password')
                };
              } else if (result.type === 'error') {
                resetNote = {
                  kind: 'error',
                  text: result.error?.message ?? 'Something went wrong'
                };
              } else if (result.type === 'success') {
                updated = true;
              }
              await update({ reset: false });
            };
          }}
          class="space-y-5"
        >
          <div class="grid gap-2">
            <Label for="password">New password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minlength={8}
              bind:value={password}
              placeholder="••••••••"
              autocomplete="new-password"
            />
            <p class="text-xs text-muted-foreground">At least 8 characters.</p>
          </div>

          <Button type="submit" class="w-full" disabled={submitting} data-testid="reset-submit">
            {submitting ? 'Updating…' : 'Update password'}
          </Button>

          {#if resetNote}
            <FormNote kind={resetNote.kind} text={resetNote.text} />
          {/if}
        </form>
      </CardContent>
    {/if}
  </Card>
</div>

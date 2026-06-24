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
  import { toast } from 'svelte-sonner';

  let password = $state('');
  let submitting = $state(false);
</script>

<div class="grid place-items-center">
  <Card
    class="relative z-10 w-full max-w-md rounded-2xl border border-border/60 bg-card/90 shadow-2xl backdrop-blur-xl"
  >
    <CardHeader class="space-y-1">
      <CardTitle class="text-3xl">Set new password</CardTitle>
      <CardDescription>Choose a password for your account.</CardDescription>
    </CardHeader>

    <CardContent>
      <form
        method="POST"
        use:enhance={() => {
          submitting = true;
          return async ({ result, update }) => {
            submitting = false;
            if (result.type === 'failure') {
              toast.error(String(result.data?.message ?? 'Could not update password'));
            } else if (result.type === 'error') {
              toast.error(result.error?.message ?? 'Something went wrong');
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

        <Button type="submit" class="w-full" disabled={submitting}>
          {submitting ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </CardContent>
  </Card>
</div>

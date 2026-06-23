<script lang="ts">
  import { enhance } from '$app/forms';

  // shadcn-svelte UI
  import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter
  } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Button } from '$lib/components/ui/button';
  import { toast } from 'svelte-sonner';
  import { RadioGroup, RadioGroupItem } from '$lib/components/ui/radio-group';

  let email = $state('');
  let password = $state('');
  let method: 'magic' | 'password' = $state('password');
  let submitting = $state(false);
</script>

<!-- Backdrop that makes the card pop -->
<div
  class="relative grid place-items-center bg-[radial-gradient(ellipse_at_top,theme(colors.neutral.900),theme(colors.neutral.950))]"
>
  <Card
    class="relative z-10 w-full max-w-md rounded-2xl border border-border/60 bg-card/90 shadow-2xl backdrop-blur-xl"
  >
    <CardHeader class="space-y-1">
      <CardTitle class="text-3xl">Sign in</CardTitle>
      <CardDescription>Use a magic link or your password.</CardDescription>
    </CardHeader>

    <CardContent>
      <form
        method="POST"
        use:enhance={() => {
          submitting = true;
          return async ({ result, update }) => {
            submitting = false;
            if (result.type === 'failure') {
              toast.error(String(result.data?.message ?? 'Sign-in failed'));
            } else if (result.type === 'success') {
              toast.success(String(result.data?.message ?? 'Signed in'));
            } else if (result.type === 'error') {
              toast.error(result.error?.message ?? 'Something went wrong');
            }
            // Applies the result: follows the redirect on password sign-in,
            // re-runs load on success. Keep field values on failure.
            await update({ reset: false });
          };
        }}
        class="space-y-5"
      >
        <!-- Email -->
        <div class="grid gap-2">
          <Label for="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            bind:value={email}
            placeholder="you@example.com"
            autocomplete="email"
          />
          {#if method === 'magic'}
            <p class="text-xs text-muted-foreground">
              A secure sign-in link will be sent to this address.
            </p>
          {/if}
        </div>

        <!-- Method toggle -->
        <fieldset class="grid gap-3">
          <legend class="sr-only">Sign-in method</legend>
          <Label class="text-sm font-medium">Method</Label>
          <RadioGroup bind:value={method} class="grid grid-cols-2 gap-2">
            <label
              for="method-password"
              class="flex cursor-pointer items-center space-x-2 rounded-lg border border-border/70 p-3 transition hover:bg-accent/40"
            >
              <RadioGroupItem id="method-password" value="password" />
              <span class="text-sm font-medium">Email + password</span>
            </label>
            <label
              for="method-magic"
              class="flex cursor-pointer items-center space-x-2 rounded-lg border border-border/70 p-3 transition hover:bg-accent/40"
            >
              <RadioGroupItem id="method-magic" value="magic" />
              <span class="text-sm font-medium">Magic link</span>
            </label>
          </RadioGroup>
        </fieldset>

        {#if method === 'password'}
          <div class="grid gap-2">
            <Label for="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              bind:value={password}
              placeholder="••••••••"
              autocomplete="current-password"
            />
          </div>
        {/if}

        <!-- Submit -->
        <Button type="submit" class="w-full" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </CardContent>

    <CardFooter class="justify-center">
      <p class="text-center text-sm text-muted-foreground">
        Having trouble? <a href="/auth/error" class="underline underline-offset-4">Auth help</a>
      </p>
    </CardFooter>
  </Card>
</div>

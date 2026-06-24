<script lang="ts">
  import { enhance } from '$app/forms';

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

  type Mode = 'signin' | 'signup' | 'resetRequest';

  let email = $state('');
  let password = $state('');
  let method: 'magic' | 'password' = $state('password');
  let mode: Mode = $state('signin');
  let submitting = $state(false);

  const titles: Record<Mode, string> = {
    signin: 'Sign in',
    signup: 'Create account',
    resetRequest: 'Forgot password'
  };

  const descriptions: Record<Mode, string> = {
    signin: 'Use a magic link or your password.',
    signup: 'Enter your email and choose a password.',
    resetRequest: 'Enter your email to receive a password reset link.'
  };

  const submitLabels: Record<Mode, [string, string]> = {
    signin: ['Sign in', 'Signing in…'],
    signup: ['Create account', 'Creating account…'],
    resetRequest: ['Send reset link', 'Sending…']
  };

  function switchMode(next: Mode) {
    mode = next;
    email = '';
    password = '';
  }
</script>

<div class="grid place-items-center">
  <Card
    class="relative z-10 w-full max-w-md rounded-2xl border border-border/60 bg-card/90 shadow-2xl backdrop-blur-xl"
  >
    <CardHeader class="space-y-1">
      <CardTitle class="text-3xl">{titles[mode]}</CardTitle>
      <CardDescription>{descriptions[mode]}</CardDescription>
    </CardHeader>

    <CardContent>
      <form
        action="?/{mode}"
        method="POST"
        use:enhance={() => {
          submitting = true;
          return async ({ result, update }) => {
            submitting = false;
            if (result.type === 'failure') {
              toast.error(String(result.data?.message ?? 'Something went wrong'));
            } else if (result.type === 'success') {
              toast.success(String(result.data?.message ?? 'Done'));
            } else if (result.type === 'error') {
              toast.error(result.error?.message ?? 'Something went wrong');
            }
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
          {#if mode === 'signin' && method === 'magic'}
            <p class="text-xs text-muted-foreground">
              A secure sign-in link will be sent to this address.
            </p>
          {/if}
        </div>

        <!-- Sign-in: method toggle + password -->
        {#if mode === 'signin'}
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
              <div class="flex items-center justify-between">
                <Label for="password">Password</Label>
                <button
                  type="button"
                  class="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                  onclick={() => switchMode('resetRequest')}
                >
                  Forgot password?
                </button>
              </div>
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
        {/if}

        <!-- Sign-up: password -->
        {#if mode === 'signup'}
          <div class="grid gap-2">
            <Label for="password">Password</Label>
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
        {/if}

        <!-- Submit -->
        <Button type="submit" class="w-full" disabled={submitting}>
          {submitting ? submitLabels[mode][1] : submitLabels[mode][0]}
        </Button>
      </form>
    </CardContent>

    <CardFooter class="flex-col gap-2">
      {#if mode === 'signin'}
        <p class="text-center text-sm text-muted-foreground">
          New here?
          <button
            type="button"
            class="underline underline-offset-4 hover:text-foreground"
            onclick={() => switchMode('signup')}
          >
            Create an account
          </button>
        </p>
        <p class="text-center text-sm text-muted-foreground">
          Having trouble? <a href="/auth/error" class="underline underline-offset-4">Auth help</a>
        </p>
      {:else if mode === 'signup'}
        <p class="text-center text-sm text-muted-foreground">
          Already have an account?
          <button
            type="button"
            class="underline underline-offset-4 hover:text-foreground"
            onclick={() => switchMode('signin')}
          >
            Sign in
          </button>
        </p>
      {:else}
        <p class="text-center text-sm text-muted-foreground">
          <button
            type="button"
            class="underline underline-offset-4 hover:text-foreground"
            onclick={() => switchMode('signin')}
          >
            Back to Sign in
          </button>
        </p>
      {/if}
    </CardFooter>
  </Card>
</div>

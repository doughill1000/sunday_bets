<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/state';

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
  import MailCheck from '@lucide/svelte/icons/mail-check';

  type Mode = 'signin' | 'signup' | 'resetRequest';

  let email = $state('');
  let password = $state('');
  let mode: Mode = $state('signin');
  let submitting = $state(false);
  let signupSentEmail = $state<string | null>(null);
  let resending = $state(false);

  const titles: Record<Mode, string> = {
    signin: 'Sign in',
    signup: 'Create account',
    resetRequest: 'Forgot password'
  };

  const descriptions: Record<Mode, string> = {
    signin: 'Use your password or continue with Google.',
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
    signupSentEmail = null;
  }

  // Post-auth redirect target (e.g. /join/[code]). A form's `action` attribute
  // replaces the page's query string, so we re-append `next` to the action URL;
  // otherwise the server action can't read it and falls back to /picks.
  const nextParam = $derived(page.url.searchParams.get('next'));
  function actionFor(m: string): string {
    return nextParam ? `?/${m}&next=${encodeURIComponent(nextParam)}` : `?/${m}`;
  }
</script>

<div class="grid place-items-center">
  <Card
    class="relative z-10 w-full max-w-md rounded-2xl border border-border/60 bg-card/90 shadow-2xl backdrop-blur-xl"
  >
    {#if signupSentEmail}
      <CardHeader class="items-center space-y-2 text-center">
        <MailCheck class="h-10 w-10 text-primary" aria-hidden="true" />
        <CardTitle class="text-3xl" data-testid="auth-check-email-title">Check your email</CardTitle
        >
        <CardDescription>
          We sent a confirmation link to
          <span class="font-medium text-foreground">{signupSentEmail}</span>. Click it to finish
          creating your account.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          method="POST"
          action={actionFor('resend')}
          use:enhance={() => {
            resending = true;
            return async ({ result, update }) => {
              resending = false;
              if (result.type === 'failure') {
                toast.error(String(result.data?.message ?? 'Could not resend email'));
              } else if (result.type === 'success') {
                toast.success(String(result.data?.message ?? 'Confirmation email resent'));
              } else if (result.type === 'error') {
                toast.error(result.error?.message ?? 'Something went wrong');
              }
              await update({ reset: false });
            };
          }}
        >
          <input type="hidden" name="email" value={signupSentEmail} />
          <Button
            type="submit"
            variant="outline"
            class="w-full"
            disabled={resending}
            data-testid="auth-resend-submit"
          >
            {resending ? 'Resending…' : 'Resend confirmation email'}
          </Button>
        </form>
      </CardContent>

      <CardFooter class="flex-col gap-2">
        <p class="text-center text-sm text-muted-foreground">
          <button
            type="button"
            class="underline underline-offset-4 hover:text-foreground"
            data-testid="auth-back-to-signin"
            onclick={() => switchMode('signin')}
          >
            Back to sign in
          </button>
        </p>
      </CardFooter>
    {:else}
      <CardHeader class="space-y-1">
        <CardTitle class="text-3xl" data-testid="auth-card-title">{titles[mode]}</CardTitle>
        <CardDescription data-testid="auth-description">{descriptions[mode]}</CardDescription>
      </CardHeader>

      <CardContent>
        <form
          action={actionFor(mode)}
          method="POST"
          use:enhance={() => {
            submitting = true;
            return async ({ result, update }) => {
              submitting = false;
              if (result.type === 'failure') {
                toast.error(String(result.data?.message ?? 'Something went wrong'));
              } else if (result.type === 'success') {
                toast.success(String(result.data?.message ?? 'Done'));
                if (mode === 'signup') signupSentEmail = email;
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
          </div>

          <!-- Sign-in: password -->
          {#if mode === 'signin'}
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
          <Button type="submit" class="w-full" disabled={submitting} data-testid="auth-submit">
            {submitting ? submitLabels[mode][1] : submitLabels[mode][0]}
          </Button>
        </form>
      </CardContent>

      {#if mode === 'signin'}
        <CardContent class="pt-0">
          <div class="relative my-4 flex items-center">
            <div class="flex-1 border-t border-border/60"></div>
            <span class="mx-3 text-xs text-muted-foreground">or</span>
            <div class="flex-1 border-t border-border/60"></div>
          </div>

          <form method="POST" action={actionFor('google')}>
            <Button type="submit" variant="outline" class="w-full gap-2">
              <svg class="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>
          </form>
        </CardContent>
      {/if}

      <CardFooter class="flex-col gap-2">
        {#if mode === 'signin'}
          <p class="text-center text-sm text-muted-foreground">
            New here?
            <button
              type="button"
              class="underline underline-offset-4 hover:text-foreground"
              data-testid="auth-switch-signup"
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
    {/if}
  </Card>
</div>

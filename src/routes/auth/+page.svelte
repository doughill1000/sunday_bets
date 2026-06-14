<script lang="ts">
  import { invalidateAll } from '$app/navigation';

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
  let method: 'magic' | 'password' = $state('magic');
  let error = $state('');
  let message = $state('');

  async function onSubmit(e: Event) {
    e.preventDefault();
    error = '';
    message = '';
    const res = await fetch('/auth', {
      method: 'POST',
      body: new FormData(e.target as HTMLFormElement)
    });
    const j: { data: string } = await res.json();
    const data: [{ ok: number; message: number }, boolean, string] = JSON.parse(j.data);
    if (!data[1]) {
      toast.error(data[2]);
      return;
    }
    toast.success(data[2]);
    invalidateAll();
  }
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
        onsubmit={(e) => {
          e.preventDefault();
          onSubmit(e);
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
          <p class="text-xs text-muted-foreground">
            We’ll send a secure link if you choose magic link.
          </p>
        </div>

        <!-- Method toggle -->
        <fieldset class="grid gap-3">
          <legend class="sr-only">Sign-in method</legend>
          <Label class="text-sm font-medium">Method</Label>
          <RadioGroup bind:value={method} class="grid grid-cols-2 gap-2">
            <div
              class="flex items-center space-x-2 rounded-lg border border-border/70 p-3 transition hover:bg-accent/40"
            >
              <RadioGroupItem id="method-magic" value="magic" />
              <Label for="method-magic" class="cursor-pointer">Magic link</Label>
            </div>
            <div
              class="flex items-center space-x-2 rounded-lg border border-border/70 p-3 transition hover:bg-accent/40"
            >
              <RadioGroupItem id="method-password" value="password" />
              <Label for="method-password" class="cursor-pointer">Email + password</Label>
            </div>
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
        <Button type="submit" class="w-full">Sign in</Button>
      </form>
    </CardContent>

    <CardFooter class="justify-center">
      <p class="text-center text-sm text-muted-foreground">
        Having trouble? <a href="/auth/error" class="underline underline-offset-4">Auth help</a>
      </p>
    </CardFooter>
  </Card>
</div>

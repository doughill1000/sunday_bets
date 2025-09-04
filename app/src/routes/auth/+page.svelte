<script lang="ts">
  import { invalidateAll } from '$app/navigation';

  let email = '';
  let password = '';
  let method: 'magic' | 'password' = 'magic';
  let error = '';
  let message = '';

  async function onSubmit(e: Event) {
    e.preventDefault();
    const res = await fetch('/auth', {
      method: 'POST',
      body: new FormData(e.target as HTMLFormElement)
    });
    const j = await res.json();
    if (!res.ok) { error = j.error ?? 'Login error'; return; }
    message = j.message ?? 'Check your email for the link.';
    if (j.redirect) location.href = j.redirect;
    else await invalidateAll();
  }
</script>

<!-- Container -->
<section class="container mx-auto max-w-md p-6 space-y-6">
  <header class="space-y-2">
    <h1 class="text-3xl font-bold">Sign in</h1>
    <p class="text-muted-50">Use a magic link or your password.</p>
  </header>

  <form method="POST" on:submit|preventDefault={onSubmit} class="space-y-5">
    <!-- Email -->
    <div class="field">
      <label class="label" for="email">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        required
        bind:value={email}
        class="input w-full"
        placeholder="you@example.com"
      />
      <small class="helper-text">We’ll send a secure link if you choose magic link.</small>
    </div>

    <!-- Method toggle -->
    <fieldset class="fieldset">
      <legend class="legend">Method</legend>
      <div class="flex gap-4">
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="radio" name="method" value="magic" bind:group={method} checked class="radio" />
          <span>Magic link</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="radio" name="method" value="password" bind:group={method} class="radio" />
          <span>Email + password</span>
        </label>
      </div>
    </fieldset>

    {#if method === 'password'}
      <div class="field">
        <label class="label" for="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          bind:value={password}
          class="input w-full"
          placeholder="••••••••"
        />
      </div>
    {/if}

    <!-- Submit -->
    <button type="submit" class="btn variant-filled-primary w-full">Sign in</button>

    {#if error}<p class="text-error-500 mt-2">{error}</p>{/if}
    {#if message}<p class="text-success-500 mt-2">{message}</p>{/if}
  </form>

  <footer class="text-center text-muted-50 text-sm">
    Having trouble? <a href="/auth/error" class="link">Auth help</a>
  </footer>
</section>
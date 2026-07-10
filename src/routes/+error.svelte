<script lang="ts">
  import { page } from '$app/state';
  import { buttonVariants } from '$lib/components/ui/button';

  // Root error boundary: renders inside the app shell for any child-route or
  // load-function error (including `throw error(403/404/…)`). A root-*layout*
  // crash still falls back to SvelteKit's stock template — see the 2026-07-09
  // error-handling audit (P2 follow-up).
  const status = $derived(page.status);

  const headline = $derived(
    status === 404
      ? 'Page not found'
      : status === 403
        ? "You don't have access"
        : status === 401
          ? 'Please sign in'
          : 'Something broke on our end'
  );

  const body = $derived(
    status === 404
      ? "This page doesn't exist, or it may have moved."
      : status === 403
        ? "You don't have permission to view this page."
        : status === 401
          ? 'Your session may have expired — sign in to continue.'
          : 'An unexpected error occurred. We’ve been notified — please try again in a moment.'
  );

  // Only surface the underlying message for client (4xx) errors, where it is
  // user-appropriate. 5xx messages can carry internal detail, so keep those
  // generic (the raw cause is captured server-side in Sentry, not shown here).
  const detail = $derived(status < 500 ? page.error?.message : undefined);
  const showDetail = $derived(!!detail && detail !== headline && detail !== 'Not Found');

  function reload() {
    location.reload();
  }
</script>

<section
  class="flex min-h-[60svh] flex-col items-center justify-center px-4 text-center"
  data-testid="error-page"
>
  <p class="text-sm font-semibold uppercase tracking-widest text-ember">Error {status}</p>
  <h1 class="mt-3 text-3xl font-bold text-foreground sm:text-4xl">{headline}</h1>
  <p class="mt-3 max-w-md text-muted-foreground">{body}</p>
  {#if showDetail}
    <p class="mt-2 max-w-md text-sm text-muted-foreground/80">{detail}</p>
  {/if}

  <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
    <a href="/" class={buttonVariants({ variant: 'default' })}>Back to home</a>
    <button type="button" class={buttonVariants({ variant: 'outline' })} onclick={reload}>
      Try again
    </button>
  </div>
</section>

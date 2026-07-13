<script lang="ts">
  import { buttonVariants } from '$lib/components/ui/button';
</script>

<section class="container mx-auto max-w-lg space-y-4 p-6">
  <h1 class="text-2xl font-bold">Sign-in link trouble</h1>
  <div class="rounded-xl border p-4 space-y-2">
    <p class="text-muted-foreground">If your link isn't working:</p>
    <ul class="list-disc space-y-1 pl-6">
      <li>Open it on the same device and browser you used to request it.</li>
      <li>Try again in a private window — some browser extensions block redirects.</li>
      <li>Links expire after a while. Request a new one if it's been a bit.</li>
    </ul>
  </div>
  <a href="/auth" class={buttonVariants({ variant: 'default' })}>Back to sign in</a>
</section>

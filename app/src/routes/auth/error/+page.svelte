<script>
  export let data;
</script>

<section class="container mx-auto max-w-lg p-6 space-y-4">
  <h1 class="text-2xl font-bold">Authentication Help</h1>
  <div class="card p-4 space-y-2">
    <p class="text-muted-50">If your magic link isn’t working:</p>
    <ul class="list-disc pl-6 space-y-1">
      <li>Open the link on the same device and browser you used to request it.</li>
      <li>Try again in a private window (extensions can block redirects).</li>
      <li>Ensure your project URL and redirect are correct in the Supabase settings.</li>
    </ul>
  </div>
  <a href="/auth" class="btn variant-filled-primary">Back to Login</a>
</section>
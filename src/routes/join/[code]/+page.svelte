<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';
  import { Button } from '$lib/components/ui/button';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let submitting = $state(false);
</script>

<section class="container mx-auto max-w-lg space-y-6 p-6">
  {#if data.status === 'valid'}
    <div class="space-y-2">
      <h1 class="text-2xl font-bold">
        You're invited{data.groupName ? ` to ${data.groupName}` : ''}
      </h1>
      <p class="text-muted-foreground">
        Click below to join{data.groupName ? ` ${data.groupName}` : ' the group'} and start picking.
      </p>
    </div>

    {#if form?.error}
      <div class="rounded-xl border border-destructive p-3 text-sm text-destructive">
        {form.error}
      </div>
    {/if}

    <form
      method="POST"
      use:enhance={() => {
        submitting = true;
        return async ({ update }) => {
          submitting = false;
          await update();
        };
      }}
    >
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Joining…' : `Join${data.groupName ? ` ${data.groupName}` : ' group'}`}
      </Button>
    </form>
  {:else if data.status === 'invalid'}
    <div class="space-y-2">
      <h1 class="text-2xl font-bold">Invite not found</h1>
      <p class="text-muted-foreground">
        This invite link is not valid. Double-check the URL or ask your commissioner for a new one.
      </p>
    </div>
  {:else if data.status === 'revoked'}
    <div class="space-y-2">
      <h1 class="text-2xl font-bold">Invite revoked</h1>
      <p class="text-muted-foreground">This invite has been revoked by the group commissioner.</p>
    </div>
  {:else if data.status === 'expired'}
    <div class="space-y-2">
      <h1 class="text-2xl font-bold">Invite expired</h1>
      <p class="text-muted-foreground">
        This invite link has expired. Ask your commissioner for a new one.
      </p>
    </div>
  {:else if data.status === 'exhausted'}
    <div class="space-y-2">
      <h1 class="text-2xl font-bold">Invite fully used</h1>
      <p class="text-muted-foreground">
        This invite has already been used the maximum number of times. Ask your commissioner for a
        new one.
      </p>
    </div>
  {/if}

  <a href="/auth/signout" class="inline-block text-sm underline">Sign out</a>
</section>

<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';
  import { Button } from '$lib/components/ui/button';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let submitting = $state(false);
</script>

<section class="container mx-auto max-w-lg space-y-6 p-6">
  {#if data.status === 'valid'}
    <div class="space-y-2" data-testid="invite-valid-view">
      <h1 class="text-2xl font-bold">
        You're invited{data.groupName ? ` to ${data.groupName}` : ''}
      </h1>
      <p class="text-muted-foreground">
        Click below to join{data.groupName ? ` ${data.groupName}` : ' the league'} and start picking.
      </p>
    </div>

    <!-- Partial-season onboarding (ADR-0037): make the participation boundary legible before
         joining so a midseason joiner isn't surprised by blank earlier weeks. -->
    <div
      class="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm"
      data-testid="invite-participation-note"
    >
      {#if data.startsWeekNumber != null && data.startsWeekNumber > 0}
        You're in from <span class="font-medium">Week {data.startsWeekNumber}</span>. Games that
        kicked off before you joined don't count for or against you.
      {:else}
        You're in from your first pickable game. Games that kicked off before you joined don't count
        for or against you.
      {/if}
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
      <Button type="submit" disabled={submitting} data-testid="invite-join-button">
        {submitting ? 'Joining…' : `Join${data.groupName ? ` ${data.groupName}` : ' league'}`}
      </Button>
    </form>
  {:else if data.status === 'invalid'}
    <div class="space-y-2" data-testid="invite-invalid-view">
      <h1 class="text-2xl font-bold">Invite not found</h1>
      <p class="text-muted-foreground">
        This invite link is not valid. Double-check the URL or ask your commissioner for a new one.
      </p>
    </div>
  {:else if data.status === 'revoked'}
    <div class="space-y-2" data-testid="invite-revoked-view">
      <h1 class="text-2xl font-bold">Invite revoked</h1>
      <p class="text-muted-foreground">This invite has been revoked by the league commissioner.</p>
    </div>
  {:else if data.status === 'expired'}
    <div class="space-y-2" data-testid="invite-expired-view">
      <h1 class="text-2xl font-bold">Invite expired</h1>
      <p class="text-muted-foreground">
        This invite link has expired. Ask your commissioner for a new one.
      </p>
    </div>
  {:else if data.status === 'exhausted'}
    <div class="space-y-2" data-testid="invite-exhausted-view">
      <h1 class="text-2xl font-bold">Invite fully used</h1>
      <p class="text-muted-foreground">
        This invite has already been used the maximum number of times. Ask your commissioner for a
        new one.
      </p>
    </div>
  {/if}

  <a href="/auth/signout" class="inline-block text-sm underline">Sign out</a>
</section>

<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';
  import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let name = $state(form?.name ?? '');
  let submitting = $state(false);
</script>

<section class="container mx-auto max-w-lg space-y-6 p-6">
  <div class="space-y-2">
    <h1 class="text-2xl font-bold">Not yet in a group</h1>
    <p class="text-muted-foreground">
      You don't have an active group membership yet. Ask your commissioner for an invite to join an
      existing group.
    </p>
  </div>

  {#if data.canCreate}
    <Card class="p-6">
      <CardHeader class="mb-2 p-0">
        <CardTitle class="text-xl font-bold">Create a group</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4 p-0 pt-2">
        <p class="text-sm text-muted-foreground">Start a new group. You'll be its commissioner.</p>
        <form
          method="POST"
          action="?/create"
          use:enhance={() => {
            submitting = true;
            return async ({ update }) => {
              submitting = false;
              await update();
            };
          }}
          class="space-y-4"
        >
          <div class="space-y-2">
            <Label for="group-name">Group name</Label>
            <Input
              id="group-name"
              name="name"
              type="text"
              required
              maxlength={60}
              bind:value={name}
              placeholder="Sunday Squad"
              autocomplete="off"
            />
          </div>

          {#if form?.error}
            <div class="rounded-xl border border-destructive p-3 text-sm">{form.error}</div>
          {/if}

          <div class="flex justify-end">
            <Button type="submit" disabled={submitting || name.trim().length === 0}>
              {submitting ? 'Creating…' : 'Create group'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  {/if}

  <a href="/auth/signout" class="inline-block text-sm underline">Sign out</a>
</section>

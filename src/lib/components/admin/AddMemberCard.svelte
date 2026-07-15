<script lang="ts">
  import AdminCard from './AdminCard.svelte';
  import { Button } from '$lib/components/ui/button';
  import { addMember } from '$lib/api/admin/members';
  import { onMount } from 'svelte';

  interface Props {
    onNote?: (kind: 'success' | 'warn' | 'error', text: string) => void;
  }
  let { onNote }: Props = $props();

  let email = $state('');
  let displayName = $state('');
  let password = $state('');
  let busy = $state(false);
  let mounted = $state(false);
  let lastResult: { email: string; temporaryPassword: string } | null = $state(null);

  onMount(() => {
    mounted = true;
  });

  function note(kind: 'success' | 'warn' | 'error', text: string) {
    onNote?.(kind, text);
  }

  async function submit() {
    if (!email.trim() || !displayName.trim()) {
      note('warn', 'Email and display name are required.');
      return;
    }
    busy = true;
    lastResult = null;
    try {
      const result = await addMember({
        email: email.trim(),
        displayName: displayName.trim(),
        password: password.trim() || undefined
      });
      lastResult = { email: result.email, temporaryPassword: result.temporaryPassword };
      note('success', `Added ${result.displayName} (${result.email}) to the league.`);
      email = '';
      displayName = '';
      password = '';
    } catch (err) {
      note('error', err instanceof Error ? err.message : 'Failed to add member.');
    } finally {
      busy = false;
    }
  }
</script>

<div data-testid="add-member-card">
  <AdminCard title="Admin • Add Member" subtitle="Onboard a new player to the league">
    <div class="mb-4 grid gap-3">
      <div>
        <label class="text-sm opacity-80" for="member-email">Email</label>
        <input
          id="member-email"
          data-testid="add-member-email"
          class="w-full rounded border bg-background p-2"
          type="email"
          bind:value={email}
          placeholder="player@example.com"
          disabled={busy}
        />
      </div>

      <div>
        <label class="text-sm opacity-80" for="member-display-name">Display Name</label>
        <input
          id="member-display-name"
          data-testid="add-member-display-name"
          class="w-full rounded border bg-background p-2"
          bind:value={displayName}
          placeholder="e.g. Doug"
          disabled={busy}
        />
      </div>

      <div>
        <label class="text-sm opacity-80" for="member-password">
          Password <span class="opacity-60">(leave blank to auto-generate)</span>
        </label>
        <input
          id="member-password"
          data-testid="add-member-password"
          class="w-full rounded border bg-background p-2"
          type="text"
          bind:value={password}
          placeholder="auto-generated if empty"
          disabled={busy}
        />
      </div>
    </div>

    <Button
      variant="default"
      onclick={submit}
      disabled={busy || !mounted}
      data-testid="add-member-submit"
    >
      {busy ? 'Adding…' : 'Add Member'}
    </Button>

    {#if lastResult}
      <div
        data-testid="add-member-result"
        class="mt-4 rounded-lg border border-success bg-success/10 p-3 text-sm"
      >
        <div class="font-medium">Member added — share these credentials privately:</div>
        <div class="mt-1 font-mono">
          <span class="opacity-70">Email:</span>
          {lastResult.email}
        </div>
        <div class="font-mono">
          <span class="opacity-70">Password:</span>
          {lastResult.temporaryPassword}
        </div>
      </div>
    {/if}
  </AdminCard>
</div>

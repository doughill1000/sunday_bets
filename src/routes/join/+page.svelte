<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import type { PageData, ActionData } from './$types';
  import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
  import { Button, buttonVariants } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let name = $state(form?.name ?? '');
  let submitting = $state(false);

  // Start-week choice (ADR-0037 ruling 5). Default is "this week, from now" — the safe
  // default that needs no explicit value. "A future week" is only offered when the schedule
  // has upcoming weeks to pick from.
  const upcomingWeeks = $derived(data.upcomingWeeks ?? []);
  let startMode = $state<'now' | 'future'>('now');
  let selectedWeekStart = $state('');
  // Default the picker to the soonest upcoming week once options are known.
  $effect(() => {
    if (!selectedWeekStart && upcomingWeeks.length > 0)
      selectedWeekStart = upcomingWeeks[0].startTs;
  });
  // The value posted to the create action: "" = start now; otherwise the chosen week's start_ts.
  const competitionStart = $derived(startMode === 'future' ? selectedWeekStart : '');

  function weekLabel(week: { weekNumber: number; startTs: string }): string {
    const when = new Date(week.startTs).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
    const round = week.weekNumber > 0 ? `Week ${week.weekNumber}` : 'Preseason';
    return `${round} · starts ${when}`;
  }

  // Paste-to-join: accept either a full invite link or a bare code and route to the
  // /join/[code] flow, which handles validation (valid / invalid / revoked / expired /
  // exhausted / already-member) with friendly copy — so we don't validate here.
  let inviteInput = $state('');

  function extractInviteCode(input: string): string {
    const raw = input.trim();
    if (!raw) return '';
    // A pasted link: take the segment right after "/join/".
    const joinMatch = raw.match(/\/join\/([^/?#\s]+)/i);
    if (joinMatch) return joinMatch[1];
    // A link without /join/ — fall back to the last path segment; otherwise the raw
    // text is treated as a bare code.
    const seg = raw
      .replace(/^[a-z]+:\/\//i, '')
      .split(/[?#]/)[0]
      .split('/')
      .filter(Boolean)
      .pop();
    return (seg ?? raw).trim();
  }

  function goToInvite(event: SubmitEvent) {
    event.preventDefault();
    const code = extractInviteCode(inviteInput);
    if (code) goto(`/join/${encodeURIComponent(code)}`);
  }
</script>

<section class="container mx-auto max-w-lg space-y-6 p-6">
  <div class="space-y-2">
    <h1 class="text-2xl font-bold">Join a league</h1>
    <p class="text-muted-foreground">
      You're not in a league yet. Paste an invite link or code from your commissioner below to join.
    </p>
  </div>

  <!-- Paste an invite -->
  <Card class="p-6">
    <CardHeader class="mb-2 p-0">
      <CardTitle class="text-xl font-bold">Have an invite?</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4 p-0 pt-2">
      <p class="text-sm text-muted-foreground">
        Paste the invite link or code your commissioner sent you.
      </p>
      <form onsubmit={goToInvite} class="space-y-4">
        <div class="space-y-2">
          <Label for="invite">Invite link or code</Label>
          <Input
            id="invite"
            name="invite"
            type="text"
            inputmode="text"
            autocapitalize="none"
            autocorrect="off"
            spellcheck={false}
            bind:value={inviteInput}
            placeholder="…/join/ABC123 or ABC123"
            autocomplete="off"
          />
        </div>
        <div class="flex justify-end">
          <Button type="submit" disabled={inviteInput.trim().length === 0}>Continue</Button>
        </div>
      </form>
    </CardContent>
  </Card>

  {#if data.canCreate}
    <Card class="p-6">
      <CardHeader class="mb-2 p-0">
        <CardTitle class="text-xl font-bold">Create a league</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4 p-0 pt-2">
        <p class="text-sm text-muted-foreground">Start a new league. You'll be its commissioner.</p>
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
            <Label for="group-name">League name</Label>
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

          <!-- Start-week choice (ADR-0037 ruling 5). Only offer "a future week" when the
               schedule has upcoming weeks; otherwise the only sensible start is now. -->
          <input type="hidden" name="competition_start" value={competitionStart} />
          {#if upcomingWeeks.length > 0}
            <fieldset class="space-y-2">
              <legend class="text-sm font-medium">When does play start?</legend>
              <label class="flex items-start gap-3">
                <input
                  type="radio"
                  name="start-mode"
                  value="now"
                  bind:group={startMode}
                  class="mt-1 h-4 w-4 border border-input"
                />
                <span class="space-y-0.5">
                  <span class="block text-sm">This week (from now)</span>
                  <span class="block text-xs text-muted-foreground">
                    Games already kicked off don't count; picking starts with the next game.
                  </span>
                </span>
              </label>
              <label class="flex items-start gap-3">
                <input
                  type="radio"
                  name="start-mode"
                  value="future"
                  bind:group={startMode}
                  class="mt-1 h-4 w-4 border border-input"
                />
                <span class="space-y-0.5">
                  <span class="block text-sm">Choose a future week</span>
                  <span class="block text-xs text-muted-foreground">
                    Competition begins at the start of the week you pick.
                  </span>
                </span>
              </label>

              {#if startMode === 'future'}
                <select
                  aria-label="Start week"
                  bind:value={selectedWeekStart}
                  class="ml-7 h-10 w-[calc(100%-1.75rem)] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none sm:w-56"
                >
                  {#each upcomingWeeks as week (week.startTs)}
                    <option value={week.startTs}>{weekLabel(week)}</option>
                  {/each}
                </select>
              {/if}
            </fieldset>
          {/if}

          {#if form?.error}
            <div class="rounded-xl border border-destructive p-3 text-sm">{form.error}</div>
          {/if}

          <div class="flex justify-end">
            <Button type="submit" disabled={submitting || name.trim().length === 0}>
              {submitting ? 'Creating…' : 'Create league'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  {/if}

  <!-- Look around first -->
  <div class="space-y-3 rounded-xl border border-border/60 p-4">
    <p class="text-sm text-muted-foreground">
      Want to look around first? The demo walks through a full fictional season — no account needed.
    </p>
    <a href="/demo" class={buttonVariants({ variant: 'outline' })}>Try the demo</a>
  </div>

  <a href="/auth/signout" class="inline-block text-sm underline">Sign out</a>
</section>

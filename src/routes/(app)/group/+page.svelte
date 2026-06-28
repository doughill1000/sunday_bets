<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import type { PageData } from './$types';
  import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import UserAvatar from '$lib/components/UserAvatar.svelte';
  import LeagueHonors from '$lib/components/stats/LeagueHonors.svelte';

  let { data }: { data: PageData } = $props();

  // ── State ─────────────────────────────────────────────────────────────────

  // Rename group
  let renaming = $state(false);
  let newGroupName = $state(data.group.name);
  let renameMsg = $state<{ kind: 'success' | 'error'; text: string } | null>(null);
  let renameBusy = $state(false);

  // League rules (grading preset + drop-worst-week)
  let preset = $state<'house' | 'gamer'>(data.gradingPreset);
  let dropWorst = $state(data.dropWorstWeek);
  let configMsg = $state<{ kind: 'success' | 'error'; text: string } | null>(null);
  let configBusy = $state(false);

  // Per-member busy states
  let memberBusy = $state<string | null>(null); // userId currently being acted on
  let memberMsg = $state<{ kind: 'success' | 'error'; text: string } | null>(null);

  // Leave group
  let leaveBusy = $state(false);
  let leaveMsg = $state<{ kind: 'success' | 'error'; text: string } | null>(null);

  // Invite
  let mintBusy = $state(false);
  let mintMsg = $state<{ kind: 'success' | 'error'; text: string } | null>(null);
  let newInviteCode = $state<string | null>(null);

  // Revoke invite
  let revokeBusy = $state<string | null>(null); // invite id

  // ── Derived ───────────────────────────────────────────────────────────────

  const commissionerCount = $derived(data.members.filter((m) => m.role === 'commissioner').length);
  const isLastCommissioner = $derived(
    data.isCommissioner &&
      commissionerCount === 1 &&
      data.members.find((m) => m.userId === data.currentUserId)?.role === 'commissioner'
  );

  // ── Actions ───────────────────────────────────────────────────────────────

  async function renameGroup() {
    if (renameBusy) return;
    renameMsg = null;
    renameBusy = true;
    try {
      const res = await fetch('/api/group/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName })
      });
      const body = (await res.json().catch(() => ({}))) as { reason?: string };
      if (!res.ok) {
        renameMsg = { kind: 'error', text: body.reason ?? 'Could not rename group.' };
        return;
      }
      renaming = false;
      renameMsg = { kind: 'success', text: 'Group renamed.' };
      await invalidateAll();
      newGroupName = data.group.name;
    } finally {
      renameBusy = false;
    }
  }

  async function saveConfig() {
    if (configBusy) return;
    configMsg = null;
    configBusy = true;
    try {
      const res = await fetch('/api/group/update-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grading_preset: preset, drop_worst_week: dropWorst })
      });
      const body = (await res.json().catch(() => ({}))) as { reason?: string };
      if (!res.ok) {
        configMsg = { kind: 'error', text: body.reason ?? 'Could not update league rules.' };
        return;
      }
      configMsg = { kind: 'success', text: 'League rules saved.' };
      await invalidateAll();
      // Re-sync local controls with the persisted values.
      preset = data.gradingPreset;
      dropWorst = data.dropWorstWeek;
    } finally {
      configBusy = false;
    }
  }

  async function removeMember(userId: string) {
    if (memberBusy) return;
    memberBusy = userId;
    memberMsg = null;
    try {
      const res = await fetch('/api/group/remove-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const body = (await res.json().catch(() => ({}))) as { reason?: string };
      if (!res.ok) {
        memberMsg = { kind: 'error', text: body.reason ?? 'Could not remove member.' };
        return;
      }
      await invalidateAll();
    } finally {
      memberBusy = null;
    }
  }

  async function promoteMember(userId: string) {
    if (memberBusy) return;
    memberBusy = userId;
    memberMsg = null;
    try {
      const res = await fetch('/api/group/promote-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const body = (await res.json().catch(() => ({}))) as { reason?: string };
      if (!res.ok) {
        memberMsg = { kind: 'error', text: body.reason ?? 'Could not promote member.' };
        return;
      }
      await invalidateAll();
    } finally {
      memberBusy = null;
    }
  }

  async function leaveGroup() {
    if (leaveBusy) return;
    leaveBusy = true;
    leaveMsg = null;
    try {
      const res = await fetch('/api/group/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const body = (await res.json().catch(() => ({}))) as { reason?: string };
      if (!res.ok) {
        leaveMsg = { kind: 'error', text: body.reason ?? 'Could not leave group.' };
        return;
      }
      // After leaving, redirect to join page (hooks.server.ts will redirect).
      window.location.href = '/join';
    } finally {
      leaveBusy = false;
    }
  }

  async function mintInvite() {
    if (mintBusy) return;
    mintBusy = true;
    mintMsg = null;
    newInviteCode = null;
    try {
      const res = await fetch('/api/group/mint-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const body = (await res.json().catch(() => ({}))) as { code?: string; reason?: string };
      if (!res.ok) {
        mintMsg = { kind: 'error', text: body.reason ?? 'Could not create invite.' };
        return;
      }
      newInviteCode = body.code ?? null;
      mintMsg = { kind: 'success', text: 'Invite created.' };
      await invalidateAll();
    } finally {
      mintBusy = false;
    }
  }

  async function revokeInvite(inviteId: string) {
    if (revokeBusy) return;
    revokeBusy = inviteId;
    try {
      const res = await fetch('/api/group/revoke-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId })
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { reason?: string };
        mintMsg = { kind: 'error', text: body.reason ?? 'Could not revoke invite.' };
        return;
      }
      await invalidateAll();
    } finally {
      revokeBusy = null;
    }
  }

  async function copyInviteLink(code: string) {
    const url = `${window.location.origin}/join/${code}`;
    await navigator.clipboard.writeText(url).catch(() => {});
  }
</script>

<section class="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
  <h1 class="text-2xl font-bold">{data.group.name}</h1>

  <!-- League honors (#305): champions, the trophy case, the wooden spoon, and
       identity badges. Visible to every member — the Group tab is now their home. -->
  <LeagueHonors honors={data.honors} badges={data.badges} currentUserId={data.currentUserId} />

  <!-- Members list -->
  <Card class="p-6">
    <CardHeader class="mb-2 p-0">
      <CardTitle class="text-xl font-bold">Members</CardTitle>
    </CardHeader>
    <CardContent class="p-0 pt-2">
      <ul class="space-y-3" aria-label="Group members">
        {#each data.members as member (member.userId)}
          {@const isSelf = member.userId === data.currentUserId}
          {@const isOnlyCommissioner = member.role === 'commissioner' && commissionerCount === 1}
          <li class="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div class="flex min-w-0 items-center gap-3">
              <UserAvatar displayName={member.displayName} avatarKey={member.avatarKey} size="sm" />
              <div class="min-w-0">
                <div class="truncate font-medium">
                  {member.displayName}{isSelf ? ' (you)' : ''}
                </div>
                <div class="text-xs text-muted-foreground capitalize">
                  {member.role}
                </div>
              </div>
            </div>

            {#if data.isCommissioner && !isSelf}
              <div class="flex shrink-0 gap-2">
                {#if member.role === 'member'}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={memberBusy === member.userId}
                    onclick={() => void promoteMember(member.userId)}
                    aria-label="Promote {member.displayName} to commissioner"
                  >
                    {memberBusy === member.userId ? 'Working…' : 'Make commissioner'}
                  </Button>
                {/if}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={memberBusy === member.userId || isOnlyCommissioner}
                  onclick={() => {
                    if (confirm(`Remove ${member.displayName} from the group?`)) {
                      void removeMember(member.userId);
                    }
                  }}
                  aria-label="Remove {member.displayName}"
                  title={isOnlyCommissioner ? 'Cannot remove the last commissioner' : undefined}
                >
                  {memberBusy === member.userId ? 'Working…' : 'Remove'}
                </Button>
              </div>
            {/if}
          </li>
        {/each}
      </ul>

      {#if memberMsg}
        <div
          class="mt-3 rounded-xl border p-3 text-sm"
          class:border-success={memberMsg.kind === 'success'}
          class:border-destructive={memberMsg.kind === 'error'}
        >
          {memberMsg.text}
        </div>
      {/if}
    </CardContent>
  </Card>

  <!-- Manage group (commissioner-only controls) — grouped under one heading so
       non-commissioner members land on the league page above, not a settings wall. -->
  {#if data.isCommissioner}
    <h2 class="text-xl font-bold">Manage group</h2>

    <!-- Group name / rename -->
    <Card class="p-6">
      <CardHeader class="mb-2 p-0">
        <CardTitle class="text-xl font-bold">Group name</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4 p-0 pt-2">
        {#if !renaming}
          <div class="flex items-center justify-between gap-4">
            <span class="text-lg font-medium">{data.group.name}</span>
            <Button
              variant="outline"
              size="sm"
              onclick={() => {
                renaming = true;
                newGroupName = data.group.name;
                renameMsg = null;
              }}
            >
              Rename
            </Button>
          </div>
        {:else}
          <form
            class="space-y-3"
            onsubmit={(e) => {
              e.preventDefault();
              void renameGroup();
            }}
          >
            <div class="space-y-1">
              <Label for="group-name">Group name</Label>
              <Input
                id="group-name"
                bind:value={newGroupName}
                maxlength={60}
                placeholder="Group name"
                disabled={renameBusy}
              />
            </div>
            <div class="flex gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={renameBusy || newGroupName.trim().length === 0}
              >
                {renameBusy ? 'Saving…' : 'Save'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={renameBusy}
                onclick={() => {
                  renaming = false;
                  renameMsg = null;
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        {/if}

        {#if renameMsg}
          <div
            class="rounded-xl border p-3 text-sm"
            class:border-success={renameMsg.kind === 'success'}
            class:border-destructive={renameMsg.kind === 'error'}
          >
            {renameMsg.text}
          </div>
        {/if}
      </CardContent>
    </Card>

    <!-- Invites -->
    <Card class="p-6">
      <CardHeader class="mb-2 p-0">
        <CardTitle class="text-xl font-bold">Invites</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4 p-0 pt-2">
        <p class="text-sm text-muted-foreground">Create invite links to share with new members.</p>

        <Button onclick={() => void mintInvite()} disabled={mintBusy}>
          {mintBusy ? 'Creating…' : 'Create invite link'}
        </Button>

        {#if newInviteCode}
          <div class="space-y-2 rounded-lg border p-3">
            <p class="text-sm font-medium">New invite link:</p>
            <div class="flex items-center gap-2">
              <code class="flex-1 truncate rounded bg-muted px-2 py-1 text-sm">
                {window?.location?.origin}/join/{newInviteCode}
              </code>
              <Button
                variant="outline"
                size="sm"
                onclick={() => void copyInviteLink(newInviteCode!)}
              >
                Copy
              </Button>
            </div>
          </div>
        {/if}

        {#if mintMsg}
          <div
            class="rounded-xl border p-3 text-sm"
            class:border-success={mintMsg.kind === 'success'}
            class:border-destructive={mintMsg.kind === 'error'}
          >
            {mintMsg.text}
          </div>
        {/if}

        {#if data.invites.length > 0}
          <div class="space-y-2 border-t pt-4">
            <p class="text-sm font-medium">Active invites</p>
            <ul class="space-y-2">
              {#each data.invites as invite (invite.id)}
                <li class="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm">
                  <div class="min-w-0">
                    <code class="truncate text-xs">{invite.code}</code>
                    <p class="text-xs text-muted-foreground">
                      Used {invite.used_count}{invite.max_uses != null ? `/${invite.max_uses}` : ''} time{invite.used_count !==
                      1
                        ? 's'
                        : ''}
                      {#if invite.expires_at}
                        · expires {new Date(invite.expires_at).toLocaleDateString()}
                      {/if}
                    </p>
                  </div>
                  <div class="flex shrink-0 gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onclick={() => void copyInviteLink(invite.code)}
                      aria-label="Copy invite link for {invite.code}"
                    >
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={revokeBusy === invite.id}
                      onclick={() => {
                        if (confirm('Revoke this invite? Any existing links will stop working.')) {
                          void revokeInvite(invite.id);
                        }
                      }}
                      aria-label="Revoke invite {invite.code}"
                    >
                      {revokeBusy === invite.id ? 'Revoking…' : 'Revoke'}
                    </Button>
                  </div>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </CardContent>
    </Card>

    <!-- League rules -->
    <Card class="p-6">
      <CardHeader class="mb-2 p-0">
        <CardTitle class="text-xl font-bold">League rules</CardTitle>
      </CardHeader>
      <CardContent class="space-y-5 p-0 pt-2">
        <form
          class="space-y-5"
          onsubmit={(e) => {
            e.preventDefault();
            void saveConfig();
          }}
        >
          <!-- Grading preset (frozen once the season has started) -->
          <div class="space-y-1">
            <Label for="grading-preset">Grading</Label>
            <select
              id="grading-preset"
              bind:value={preset}
              disabled={configBusy || data.presetLocked}
              class="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="house">House — everyone graded on the closing line (fair)</option>
              <option value="gamer">Gamer — each pick graded on its own locked line</option>
            </select>
            {#if data.presetLocked}
              <p class="text-xs text-muted-foreground">Locked — the season has started.</p>
            {:else}
              <p class="text-xs text-muted-foreground">
                Can only change before the season's first game is settled.
              </p>
            {/if}
          </div>

          <!-- Drop worst week (freely editable) -->
          <div class="flex items-start gap-3">
            <input
              id="drop-worst-week"
              type="checkbox"
              bind:checked={dropWorst}
              disabled={configBusy}
              class="border-input mt-1 h-4 w-4 rounded border"
            />
            <div class="space-y-0.5">
              <Label for="drop-worst-week">Drop each player's worst week</Label>
              <p class="text-xs text-muted-foreground">
                Exclude every member's lowest-scoring week from their season total.
              </p>
            </div>
          </div>

          <Button type="submit" size="sm" disabled={configBusy}>
            {configBusy ? 'Saving…' : 'Save'}
          </Button>
        </form>

        {#if configMsg}
          <div
            class="rounded-xl border p-3 text-sm"
            class:border-success={configMsg.kind === 'success'}
            class:border-destructive={configMsg.kind === 'error'}
          >
            {configMsg.text}
          </div>
        {/if}
      </CardContent>
    </Card>
  {/if}

  <!-- Leave group -->
  <Card class="p-6">
    <CardHeader class="mb-2 p-0">
      <CardTitle class="text-xl font-bold">Leave group</CardTitle>
    </CardHeader>
    <CardContent class="space-y-3 p-0 pt-2">
      {#if isLastCommissioner}
        <p class="text-sm text-muted-foreground">
          You are the only commissioner. Promote another member to commissioner before leaving.
        </p>
        <Button variant="destructive" disabled>Leave group</Button>
      {:else}
        <p class="text-sm text-muted-foreground">
          You will lose access to this group's picks and standings.
        </p>
        <Button
          variant="destructive"
          disabled={leaveBusy}
          onclick={() => {
            if (confirm('Leave this group? You will lose access to picks and standings.')) {
              void leaveGroup();
            }
          }}
        >
          {leaveBusy ? 'Leaving…' : 'Leave group'}
        </Button>
      {/if}

      {#if leaveMsg}
        <div
          class="rounded-xl border p-3 text-sm"
          class:border-success={leaveMsg.kind === 'success'}
          class:border-destructive={leaveMsg.kind === 'error'}
        >
          {leaveMsg.text}
        </div>
      {/if}
    </CardContent>
  </Card>
</section>

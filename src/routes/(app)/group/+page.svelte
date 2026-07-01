<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { createQuery, useQueryClient } from '@tanstack/svelte-query';
  import { queryKeys, invalidationKeys } from '$lib/query/keys';
  import { fetchGroup } from '$lib/query/fetchers';
  import type { GroupCachePayload } from '$lib/query/types';
  import type { PageData } from './$types';
  import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
  import { ACTIVE_TAB_TRIGGER_CLASS } from '$lib/ui/tabs';
  import UserAvatar from '$lib/components/UserAvatar.svelte';
  import LeagueHonors from '$lib/components/group/LeagueHonors.svelte';

  let { data: pageData }: { data: PageData } = $props();

  // Shareable group data (name, members, honors, badges) comes from a cached `createQuery`
  // keyed by `(groupId, season)`: a revisit renders the last value instantly and revalidates
  // in the background (ADR-0017). `pageData.initialGroup` is the server-prefetched value
  // (present on the initial/SSR request) used as `initialData` so first paint has no flash;
  // on a client-side cache miss the query loads and the skeleton below shows. Commissioner-
  // only data (isCommissioner, invites, grading config) stays on `pageData` and is never
  // cached. The two merge below, `pageData` last so its sensitive fields always win.
  const queryClient = useQueryClient();
  const groupQuery = createQuery(() => ({
    queryKey: queryKeys.group(pageData.groupId, pageData.badgeSeasonYear),
    queryFn: () => fetchGroup(fetch, pageData.groupId, pageData.badgeSeasonYear),
    initialData: pageData.initialGroup
  }));

  // Empty shape so the derivations below stay valid while the query loads on a cache miss
  // (the pending branch in the template gates real render).
  const EMPTY_GROUP: GroupCachePayload = {
    group: { id: '', name: '' },
    members: [],
    membersCursor: null,
    honors: { reigningChampion: null, trophyCase: [], woodenSpoon: null },
    badges: []
  };

  const data = $derived({ ...(groupQuery.data ?? EMPTY_GROUP), ...pageData });

  /** Membership / scoring change → standings, badges, and member list all go stale. */
  function invalidateGroupScoring() {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: invalidationKeys.group(pageData.groupId) }),
      queryClient.invalidateQueries({ queryKey: invalidationKeys.stats(pageData.groupId) }),
      queryClient.invalidateQueries({ queryKey: invalidationKeys.leaderboard(pageData.groupId) })
    ]);
  }

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

  // AI recap settings — commissioner controls (issue #301, ADR-0008)
  let spice = $state<'mild' | 'medium' | 'spicy'>(data.spice);
  let aiRecapsEnabled = $state(data.aiRecapsEnabled);
  let recapSettingsMsg = $state<{ kind: 'success' | 'error'; text: string } | null>(null);
  let recapSettingsBusy = $state(false);

  // AI recap opt-out — per-player (issue #301, ADR-0008)
  let aiRecapOptOut = $state(data.aiRecapOptOut);
  let optOutMsg = $state<{ kind: 'success' | 'error'; text: string } | null>(null);
  let optOutBusy = $state(false);

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
      await queryClient.invalidateQueries({ queryKey: invalidationKeys.group(pageData.groupId) });
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
      // Grading/scoring change → standings, badges, and member rows recompute. The grading
      // controls are already bound to the just-saved values, so no server-load re-sync.
      await invalidateGroupScoring();
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
      await invalidateGroupScoring();
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
      await queryClient.invalidateQueries({ queryKey: invalidationKeys.group(pageData.groupId) });
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

  async function saveRecapSettings() {
    if (recapSettingsBusy) return;
    recapSettingsMsg = null;
    recapSettingsBusy = true;
    try {
      const res = await fetch('/api/group/update-recap-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spice, ai_recaps_enabled: aiRecapsEnabled })
      });
      const body = (await res.json().catch(() => ({}))) as { reason?: string };
      if (!res.ok) {
        recapSettingsMsg = {
          kind: 'error',
          text: body.reason ?? 'Could not update AI recap settings.'
        };
        return;
      }
      recapSettingsMsg = { kind: 'success', text: 'AI recap settings saved.' };
      await invalidateAll();
      spice = data.spice;
      aiRecapsEnabled = data.aiRecapsEnabled;
    } finally {
      recapSettingsBusy = false;
    }
  }

  async function toggleOptOut(optOut: boolean) {
    if (optOutBusy) return;
    optOutMsg = null;
    optOutBusy = true;
    try {
      const res = await fetch('/api/group/recap-opt-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_recap_opt_out: optOut })
      });
      const body = (await res.json().catch(() => ({}))) as { reason?: string };
      if (!res.ok) {
        optOutMsg = { kind: 'error', text: body.reason ?? 'Could not update recap preference.' };
        aiRecapOptOut = !optOut;
        return;
      }
      optOutMsg = {
        kind: 'success',
        text: optOut ? "Opted out — you'll appear as neutral facts." : 'Opted back in.'
      };
    } finally {
      optOutBusy = false;
    }
  }
</script>

{#snippet loadingState()}
  <!-- Cache miss (no SSR initialData, nothing cached yet): skeleton while the query loads. -->
  <div class="space-y-6" aria-hidden="true">
    <div class="h-8 w-56 animate-pulse rounded bg-muted"></div>
    <div class="h-64 w-full animate-pulse rounded-xl bg-muted"></div>
    <div class="h-48 w-full animate-pulse rounded-xl bg-muted"></div>
  </div>
{/snippet}

{#snippet errorState()}
  <Card class="p-6">
    <CardHeader class="mb-2 p-0">
      <CardTitle class="text-xl font-bold">Couldn't load group</CardTitle>
    </CardHeader>
    <CardContent class="p-0 pt-2 text-sm text-muted-foreground">
      Something went wrong loading this group. Refresh the page to try again.
    </CardContent>
  </Card>
{/snippet}

<!-- League tab (default): everything every member sees — honors, the roster, and
   the personal Roast-me / Leave controls. Commissioners reach the config cards via
   the Manage tab (manageView); non-commissioners never see a tab bar, so this is
   simply their whole page. -->
{#snippet leagueView()}
  <!-- League honors (#305): champions, the trophy case, the wooden spoon, and
       identity badges. Visible to every member — the Group tab is now their home. -->
  <LeagueHonors
    honors={data.honors}
    badges={data.badges}
    members={data.members}
    currentUserId={data.currentUserId}
    seasons={data.availableSeasons}
    selectedSeason={data.badgeSeasonYear}
  />

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
          {@const isChampion = member.userId === data.honors.reigningChampion?.user_id}
          <li
            class="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
          >
            <div class="flex min-w-0 items-center gap-3">
              <UserAvatar
                displayName={member.displayName}
                avatarKey={member.avatarKey}
                size="sm"
                champion={isChampion}
              />
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
              <div class="flex shrink-0 gap-2 self-end sm:self-auto">
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

  <!-- AI recap opt-out — visible to every member (issue #301, ADR-0008) -->
  <Card class="p-6">
    <CardHeader class="mb-2 p-0">
      <CardTitle class="text-xl font-bold">Roast me?</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4 p-0 pt-2">
      <p class="text-sm text-muted-foreground">
        When on, you may appear in the weekly recap with personalised commentary. When off, you'll
        show up only as neutral facts — wins, losses, points.
      </p>
      <div class="flex items-center gap-3">
        <input
          id="ai-recap-opt-out"
          type="checkbox"
          checked={!aiRecapOptOut}
          disabled={optOutBusy}
          class="border-input h-4 w-4 rounded border"
          onchange={(e) => {
            const optOut = !(e.currentTarget as HTMLInputElement).checked;
            aiRecapOptOut = optOut;
            void toggleOptOut(optOut);
          }}
        />
        <Label for="ai-recap-opt-out">Include me in the AI recap</Label>
      </div>

      {#if optOutMsg}
        <div
          class="rounded-xl border p-3 text-sm"
          class:border-success={optOutMsg.kind === 'success'}
          class:border-destructive={optOutMsg.kind === 'error'}
        >
          {optOutMsg.text}
        </div>
      {/if}
    </CardContent>
  </Card>

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
{/snippet}

<!-- Manage tab (commissioner-only): the four group-config cards. Surfaced only under
   the Manage tab so regular members land on the League tab, not a settings wall; the
   tab label itself conveys "commissioner controls", so no separate heading is needed. -->
{#snippet manageView()}
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
            <Button variant="outline" size="sm" onclick={() => void copyInviteLink(newInviteCode!)}>
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

  <!-- AI recap settings (issue #301, ADR-0008) -->
  <Card class="p-6">
    <CardHeader class="mb-2 p-0">
      <CardTitle class="text-xl font-bold">AI Recap</CardTitle>
    </CardHeader>
    <CardContent class="space-y-5 p-0 pt-2">
      <p class="text-sm text-muted-foreground">
        Control how the weekly AI recap reads for your group.
      </p>
      <form
        class="space-y-5"
        onsubmit={(e) => {
          e.preventDefault();
          void saveRecapSettings();
        }}
      >
        <!-- Enable / disable recaps -->
        <div class="flex items-start gap-3">
          <input
            id="ai-recaps-enabled"
            type="checkbox"
            bind:checked={aiRecapsEnabled}
            disabled={recapSettingsBusy}
            class="border-input mt-1 h-4 w-4 rounded border"
          />
          <div class="space-y-0.5">
            <Label for="ai-recaps-enabled">Enable weekly AI recap</Label>
            <p class="text-xs text-muted-foreground">
              When off, the grade-cron skips recap generation for this group.
            </p>
          </div>
        </div>

        <!-- Spice picker -->
        <div
          class="space-y-1"
          class:opacity-50={!aiRecapsEnabled}
          class:pointer-events-none={!aiRecapsEnabled}
        >
          <Label for="spice">Recap tone (spice)</Label>
          <select
            id="spice"
            bind:value={spice}
            disabled={recapSettingsBusy || !aiRecapsEnabled}
            class="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="mild">Mild — light ribbing, low-key commentary</option>
            <option value="medium">Medium — playful trash talk and hype (default)</option>
            <option value="spicy">Spicy — harder roasts and bravado</option>
          </select>
          <p class="text-xs text-muted-foreground">
            All tones stay fact-faithful and in-app gameplay only.
          </p>
        </div>

        <Button type="submit" size="sm" disabled={recapSettingsBusy}>
          {recapSettingsBusy ? 'Saving…' : 'Save'}
        </Button>
      </form>

      {#if recapSettingsMsg}
        <div
          class="rounded-xl border p-3 text-sm"
          class:border-success={recapSettingsMsg.kind === 'success'}
          class:border-destructive={recapSettingsMsg.kind === 'error'}
        >
          {recapSettingsMsg.text}
        </div>
      {/if}
    </CardContent>
  </Card>
{/snippet}

<section class="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
  {#if groupQuery.isPending}
    {@render loadingState()}
  {:else if groupQuery.isError}
    {@render errorState()}
  {:else}
    <h1 class="text-2xl font-bold">{data.group.name}</h1>

    {#if data.isCommissioner}
      <Tabs value="league" class="w-full space-y-6">
        <TabsList class="grid w-full grid-cols-2 sm:inline-grid sm:w-auto">
          <TabsTrigger value="league" class={ACTIVE_TAB_TRIGGER_CLASS}>League</TabsTrigger>
          <TabsTrigger value="manage" class={ACTIVE_TAB_TRIGGER_CLASS}>Manage</TabsTrigger>
        </TabsList>
        <TabsContent value="league" class="space-y-6">{@render leagueView()}</TabsContent>
        <TabsContent value="manage" class="space-y-6">{@render manageView()}</TabsContent>
      </Tabs>
    {:else}
      {@render leagueView()}
    {/if}
  {/if}
</section>

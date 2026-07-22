<script lang="ts">
  import { onMount } from 'svelte';
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
  import UserAvatar from '$lib/components/UserAvatar.svelte';
  import FormNote from '$lib/components/FormNote.svelte';

  let { data: pageData }: { data: PageData } = $props();

  // Shareable group data (name, members, honors, badges) comes from a cached `createQuery`
  // keyed by `(groupId, season)`: a revisit renders the last value instantly and revalidates
  // in the background (ADR-0017). `pageData.initialGroup` is the server-prefetched value
  // (present on the initial/SSR request) used as `initialData` so first paint has no flash;
  // on a client-side cache miss the query loads and the skeleton below shows. Commissioner-
  // only data (invites, grading config) stays on `pageData` and is never cached. The two
  // merge below, `pageData` last so its sensitive fields always win.
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
  // Season the drop applies from (ADR-0018). Defaults to the upcoming season so enabling
  // the rule never silently rewrites a finished one; a saved value is honored on reload.
  let dropWorstStartYear = $state<number>(data.dropWorstWeekStartYear ?? data.currentSeasonYear);
  let configMsg = $state<{ kind: 'success' | 'error'; text: string } | null>(null);
  let configBusy = $state(false);

  // Competition start (ADR-0037 ruling 4): when this league's competition begins, editable only
  // until the first eligible game kicks off (data.competitionStartFrozen).
  let startMode = $state<'now' | 'future'>('now');
  let selectedWeekStart = $state('');
  $effect(() => {
    if (!selectedWeekStart && data.upcomingWeeks.length > 0)
      selectedWeekStart = data.upcomingWeeks[0].startTs;
  });
  // null = "start this week, from now" (the RPC stamps the DB's now()); otherwise a week's start_ts.
  const competitionStart = $derived(startMode === 'future' ? selectedWeekStart : null);
  let compStartMsg = $state<{ kind: 'success' | 'error'; text: string } | null>(null);
  let compStartBusy = $state(false);

  function weekLabel(week: { weekNumber: number; startTs: string }): string {
    const when = new Date(week.startTs).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
    const round = week.weekNumber > 0 ? `Week ${week.weekNumber}` : 'Preseason';
    return `${round} · starts ${when}`;
  }

  function formatStartDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  // Selectable "apply from" seasons: every season the group has played plus the upcoming
  // one, and any already-saved start year (e.g. set via SQL) so it always shows as chosen.
  const startYearOptions = $derived.by(() => {
    const years = [...data.availableSeasons, data.currentSeasonYear];
    if (data.dropWorstWeekStartYear != null) years.push(data.dropWorstWeekStartYear);
    return years.filter((year, i) => years.indexOf(year) === i).sort((a, b) => a - b);
  });

  // Per-member busy states
  let memberBusy = $state<string | null>(null); // userId currently being acted on
  let memberMsg = $state<{ kind: 'success' | 'error'; text: string } | null>(null);

  // Invite
  let mintBusy = $state(false);
  let mintMsg = $state<{ kind: 'success' | 'error'; text: string } | null>(null);
  let newInviteCode = $state<string | null>(null);
  // Web Share support is detected in onMount (client-only, post-hydration) to avoid an
  // SSR/CSR mismatch — navigator is undefined during SSR. When present we show a native
  // "Share" action; clipboard copy is the always-available fallback. `copiedCode` drives
  // the brief "Copied" confirmation on whichever link was just copied.
  let canShare = $state(false);
  let copiedCode = $state<string | null>(null);
  onMount(() => {
    canShare = typeof navigator.share === 'function';
  });

  // Revoke invite
  let revokeBusy = $state<string | null>(null); // invite id

  // AI recap settings — commissioner controls (issue #301, ADR-0008)
  let spice = $state<'mild' | 'medium' | 'spicy'>(data.spice);
  let aiRecapsEnabled = $state(data.aiRecapsEnabled);
  let recapSettingsMsg = $state<{ kind: 'success' | 'error'; text: string } | null>(null);
  let recapSettingsBusy = $state(false);

  // ── Derived ───────────────────────────────────────────────────────────────

  // Guards "Remove" on the last commissioner, matching the server-side rule. The per-player
  // recap opt-out and Leave league moved to /settings (#660) — this console is commissioner
  // controls only.
  const commissionerCount = $derived(data.members.filter((m) => m.role === 'commissioner').length);

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
        renameMsg = { kind: 'error', text: body.reason ?? 'Could not rename league.' };
        return;
      }
      renaming = false;
      renameMsg = { kind: 'success', text: 'League renamed.' };
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
        body: JSON.stringify({
          grading_preset: preset,
          drop_worst_week: dropWorst,
          drop_worst_week_start_year: dropWorstStartYear
        })
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

  async function saveCompetitionStart() {
    if (compStartBusy) return;
    compStartMsg = null;
    compStartBusy = true;
    try {
      const res = await fetch('/api/group/set-competition-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competition_start: competitionStart })
      });
      const body = (await res.json().catch(() => ({}))) as { reason?: string };
      if (!res.ok) {
        compStartMsg = { kind: 'error', text: body.reason ?? 'Could not update when play starts.' };
        return;
      }
      compStartMsg = { kind: 'success', text: 'Competition start updated.' };
      // Re-run the server load so the displayed start + frozen state re-sync, and refresh the
      // standings caches since the boundary feeds grading.
      await Promise.all([invalidateAll(), invalidateGroupScoring()]);
    } finally {
      compStartBusy = false;
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
      mintMsg = { kind: 'success', text: 'Invite link ready.' };
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

  function inviteUrl(code: string): string {
    return `${window.location.origin}/join/${code}`;
  }

  async function copyInviteLink(code: string) {
    try {
      await navigator.clipboard.writeText(inviteUrl(code));
      copiedCode = code;
      setTimeout(() => {
        if (copiedCode === code) copiedCode = null;
      }, 2000);
    } catch {
      // Clipboard unavailable (e.g. an insecure context) — the link is shown on screen
      // to copy by hand.
    }
  }

  // Native share sheet (mobile) with clipboard copy as the fallback — handing a friend the
  // invite link straight from the OS share sheet is the natural mobile flow.
  async function shareInvite(code: string) {
    const url = inviteUrl(code);
    try {
      await navigator.share({
        title: 'Join my Hotshot league',
        text: `Join my Hotshot league: ${url}`
      });
    } catch (err) {
      // Dismissing the share sheet throws AbortError — treat as a no-op. Any other
      // failure falls back to copying the link.
      if (err instanceof Error && err.name === 'AbortError') return;
      await copyInviteLink(code);
    }
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
      <CardTitle class="text-xl font-bold">Couldn't load league</CardTitle>
    </CardHeader>
    <CardContent class="p-0 pt-2 text-sm text-muted-foreground">
      Something went wrong loading this league. Refresh the page to try again.
    </CardContent>
  </Card>
{/snippet}

<!-- The roster, kept here as a commissioner tool rather than a second Standings (#660): its
   unique value is promote/remove, and /league's Standings already renders every member with
   avatar, name and record. Each member's role shows here because the commissioner needs it to
   decide who to promote; everyone else reads it off the Standings row's Commissioner chip. -->
{#snippet membersCard()}
  <Card class="p-6">
    <CardHeader class="mb-2 p-0">
      <CardTitle class="text-xl font-bold">Members</CardTitle>
    </CardHeader>
    <CardContent class="p-0 pt-2">
      <ul class="space-y-3" aria-label="League members">
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

            {#if !isSelf}
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
                    if (confirm(`Remove ${member.displayName} from the league?`)) {
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
        <FormNote kind={memberMsg.kind} text={memberMsg.text} class="mt-3" />
      {/if}
    </CardContent>
  </Card>
{/snippet}

{#snippet leagueNameCard()}
  <Card class="p-6">
    <CardHeader class="mb-2 p-0">
      <CardTitle class="text-xl font-bold">League name</CardTitle>
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
            <Label for="group-name">League name</Label>
            <Input
              id="group-name"
              bind:value={newGroupName}
              maxlength={60}
              placeholder="League name"
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
        <FormNote kind={renameMsg.kind} text={renameMsg.text} />
      {/if}
    </CardContent>
  </Card>
{/snippet}

{#snippet invitesCard()}
  <Card class="p-6">
    <CardHeader class="mb-2 p-0">
      <CardTitle class="text-xl font-bold">Invites</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4 p-0 pt-2">
      <p class="text-sm text-muted-foreground">Get an invite link to share with new members.</p>

      <Button onclick={() => void mintInvite()} disabled={mintBusy}>
        {mintBusy ? 'Loading…' : 'Get invite link'}
      </Button>

      {#if newInviteCode}
        <div class="space-y-2 rounded-lg border p-3">
          <p class="text-sm font-medium">New invite link:</p>
          <code class="block truncate rounded bg-muted px-2 py-1 text-sm">
            {window?.location?.origin}/join/{newInviteCode}
          </code>
          <div class="flex items-center gap-2">
            {#if canShare}
              <Button size="sm" onclick={() => void shareInvite(newInviteCode!)}>Share</Button>
              <Button
                variant="outline"
                size="sm"
                onclick={() => void copyInviteLink(newInviteCode!)}
              >
                {copiedCode === newInviteCode ? 'Copied' : 'Copy'}
              </Button>
            {:else}
              <Button size="sm" onclick={() => void copyInviteLink(newInviteCode!)}>
                {copiedCode === newInviteCode ? 'Copied' : 'Copy'}
              </Button>
            {/if}
          </div>
        </div>
      {/if}

      {#if mintMsg}
        <FormNote kind={mintMsg.kind} text={mintMsg.text} />
      {/if}

      {#if data.invites.length > 0}
        <div class="space-y-2 border-t pt-4">
          <p class="text-sm font-medium">Active invites</p>
          <ul class="space-y-2">
            {#each data.invites as invite (invite.id)}
              <li
                class="flex flex-col gap-2 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <div class="min-w-0">
                  <code class="block truncate text-xs">{invite.code}</code>
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
                <div class="flex shrink-0 flex-wrap gap-1.5 self-end sm:self-auto">
                  {#if canShare}
                    <Button
                      size="sm"
                      onclick={() => void shareInvite(invite.code)}
                      aria-label="Share invite link for {invite.code}"
                    >
                      Share
                    </Button>
                  {/if}
                  <Button
                    variant={canShare ? 'outline' : 'default'}
                    size="sm"
                    onclick={() => void copyInviteLink(invite.code)}
                    aria-label="Copy invite link for {invite.code}"
                  >
                    {copiedCode === invite.code ? 'Copied' : 'Copy'}
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
{/snippet}

{#snippet leagueRulesCard()}
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
            class="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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

        <!-- Drop worst week + apply-from season (ADR-0018, freely editable) -->
        <div class="space-y-3">
          <div class="flex items-start gap-3">
            <input
              id="drop-worst-week"
              type="checkbox"
              bind:checked={dropWorst}
              disabled={configBusy}
              class="mt-1 h-4 w-4 rounded border border-input"
            />
            <div class="space-y-0.5">
              <Label for="drop-worst-week">Drop each player's worst week</Label>
              <p class="text-xs text-muted-foreground">
                Exclude every member's lowest-scoring week from their standings total. Standings
                only — the win-loss record still counts every week.
              </p>
            </div>
          </div>

          {#if dropWorst}
            <div class="ml-7 space-y-1">
              <Label for="drop-worst-week-start-year">Apply from season</Label>
              <select
                id="drop-worst-week-start-year"
                bind:value={dropWorstStartYear}
                disabled={configBusy}
                class="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:w-40"
              >
                {#each startYearOptions as year (year)}
                  <option value={year}>{year}</option>
                {/each}
              </select>
              <p class="text-xs text-muted-foreground">
                Applies to this season and every season after it. Earlier seasons stay untouched —
                the rule is never applied retroactively.
              </p>
            </div>
          {/if}
        </div>

        <Button type="submit" size="sm" disabled={configBusy}>
          {configBusy ? 'Saving…' : 'Save'}
        </Button>
      </form>

      {#if configMsg}
        <FormNote kind={configMsg.kind} text={configMsg.text} />
      {/if}
    </CardContent>
  </Card>
{/snippet}

<!-- Competition start (ADR-0037 ruling 4/5): when the league's competition begins. Editable
   only until the first eligible game kicks off, then frozen — moving it after results settle
   would rewrite them. -->
{#snippet competitionStartCard()}
  <Card class="p-6">
    <CardHeader class="mb-2 p-0">
      <CardTitle class="text-xl font-bold">Competition start</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4 p-0 pt-2">
      <p class="text-sm text-muted-foreground">
        When your league's competition begins. Games before it don't count for anyone, and members
        who join later are scored from their join forward.
      </p>

      {#if data.competitionStartFrozen}
        <!-- Frozen: play has begun. Show a locked note, no controls (and no sentinel date for
             leagues that pre-date this feature). -->
        <div class="rounded-xl border border-border/60 bg-muted/30 p-3">
          <p class="text-sm font-medium">Play is underway</p>
          <p class="mt-0.5 text-xs text-muted-foreground">
            The start week is locked now that the first game has kicked off — changing it would
            rewrite results that already count.
          </p>
        </div>
      {:else}
        {#if data.competitionStartsAt}
          <p class="text-sm">
            Currently: <span class="font-medium"
              >starts {formatStartDate(data.competitionStartsAt)}</span
            >
          </p>
        {/if}

        <form
          class="space-y-4"
          onsubmit={(e) => {
            e.preventDefault();
            void saveCompetitionStart();
          }}
        >
          <fieldset class="space-y-2">
            <legend class="text-sm font-medium">Change start</legend>
            <label class="flex items-start gap-3">
              <input
                type="radio"
                name="comp-start-mode"
                value="now"
                bind:group={startMode}
                disabled={compStartBusy}
                class="mt-1 h-4 w-4 border border-input"
              />
              <span class="space-y-0.5">
                <span class="block text-sm">This week (from now)</span>
                <span class="block text-xs text-muted-foreground">
                  Games already kicked off don't count; picking starts with the next game.
                </span>
              </span>
            </label>

            {#if data.upcomingWeeks.length > 0}
              <label class="flex items-start gap-3">
                <input
                  type="radio"
                  name="comp-start-mode"
                  value="future"
                  bind:group={startMode}
                  disabled={compStartBusy}
                  class="mt-1 h-4 w-4 border border-input"
                />
                <span class="space-y-0.5">
                  <span class="block text-sm">A future week</span>
                  <span class="block text-xs text-muted-foreground">
                    Competition begins at the start of the week you pick.
                  </span>
                </span>
              </label>

              {#if startMode === 'future'}
                <select
                  aria-label="Start week"
                  bind:value={selectedWeekStart}
                  disabled={compStartBusy}
                  class="ml-7 h-10 w-[calc(100%-1.75rem)] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:w-56"
                >
                  {#each data.upcomingWeeks as week (week.startTs)}
                    <option value={week.startTs}>{weekLabel(week)}</option>
                  {/each}
                </select>
              {/if}
            {/if}
          </fieldset>

          <Button type="submit" size="sm" disabled={compStartBusy}>
            {compStartBusy ? 'Saving…' : 'Save'}
          </Button>
        </form>
      {/if}

      {#if compStartMsg}
        <FormNote kind={compStartMsg.kind} text={compStartMsg.text} />
      {/if}
    </CardContent>
  </Card>
{/snippet}

<!-- League-wide AI recap settings (issue #301, ADR-0008). The per-player "include me" opt-out
   is NOT here — it's a personal knob and lives on /settings (#660). -->
{#snippet aiRecapCard()}
  <Card class="p-6">
    <CardHeader class="mb-2 p-0">
      <CardTitle class="text-xl font-bold">AI Recap</CardTitle>
    </CardHeader>
    <CardContent class="space-y-5 p-0 pt-2">
      <p class="text-sm text-muted-foreground">
        Control how the weekly AI recap reads for your league.
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
            class="mt-1 h-4 w-4 rounded border border-input"
          />
          <div class="space-y-0.5">
            <Label for="ai-recaps-enabled">Enable weekly AI recap</Label>
            <p class="text-xs text-muted-foreground">
              When off, the grade-cron skips recap generation for this league.
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
            class="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
        <FormNote kind={recapSettingsMsg.kind} text={recapSettingsMsg.text} />
      {/if}
    </CardContent>
  </Card>
{/snippet}

<svelte:head>
  <title>Manage league | Hotshot</title>
</svelte:head>

<!-- The commissioner console (#660). One flat scroll, no tab bar: the Members/Manage tabs this
   page shipped with weren't two topics but two AUDIENCES, and the personal half moved to
   /settings. What's left is one job — running the league — so it reads top to bottom. The
   server load redirects any non-commissioner here, which is why nothing below re-checks a role. -->
<section class="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
  {#if groupQuery.isPending}
    {@render loadingState()}
  {:else if groupQuery.isError}
    {@render errorState()}
  {:else}
    <div>
      <a
        href="/league"
        class="text-sm text-muted-foreground transition-colors hover:text-foreground"
        data-testid="manage-back">← League</a
      >
      <h1 class="mt-1 text-2xl font-bold">Manage league</h1>
      <p class="text-sm text-muted-foreground">{data.group.name}</p>
    </div>

    {@render leagueNameCard()}
    {@render membersCard()}
    {@render invitesCard()}
    {@render leagueRulesCard()}
    {@render competitionStartCard()}
    {@render aiRecapCard()}
  {/if}
</section>

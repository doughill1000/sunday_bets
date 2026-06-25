<script lang="ts">
  import UserAvatar from '$lib/components/UserAvatar.svelte';
  import { weightPoints } from '$lib/domain/scoring';
  import type { GroupPickEntry } from '$lib/types/picks';

  interface Props {
    picks: GroupPickEntry[];
    myUserId: string;
  }
  let { picks, myUserId }: Props = $props();

  function pointsOf(w: GroupPickEntry['weight']) {
    return w ? weightPoints(w) : 0;
  }

  // Within a team: the current user first, then heaviest weight, then name.
  function sortMembers(a: GroupPickEntry, b: GroupPickEntry) {
    if (a.userId === myUserId) return -1;
    if (b.userId === myUserId) return 1;
    const byWeight = pointsOf(b.weight) - pointsOf(a.weight);
    if (byWeight !== 0) return byWeight;
    return (a.displayName ?? '').localeCompare(b.displayName ?? '');
  }

  // Order team blocks away-then-home to match the "AWAY @ HOME" matchup title.
  function sideRank(side: GroupPickEntry['pickedSide']) {
    return side === 'away' ? 0 : side === 'home' ? 1 : 2;
  }

  type TeamGroup = {
    side: GroupPickEntry['pickedSide'];
    label: string;
    members: GroupPickEntry[];
  };

  const teams = $derived.by(() => {
    const groups: Record<string, TeamGroup> = {};
    for (const p of picks) {
      const key = p.pickedTeamShort ?? p.pickedSide ?? p.userId;
      const group = (groups[key] ??= {
        side: p.pickedSide,
        label: p.pickedTeamShort ?? '—',
        members: []
      });
      group.members.push(p);
    }
    const list = Object.values(groups);
    for (const group of list) group.members.sort(sortMembers);
    list.sort((a, b) => sideRank(a.side) - sideRank(b.side));
    return list;
  });
</script>

{#if picks.length > 0}
  <div class="mt-2 border-t pt-2">
    <p class="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      Group picks
    </p>
    <div class="space-y-1.5">
      {#each teams as team (team.label)}
        <div class="flex gap-2">
          <span class="mt-0.5 w-10 shrink-0 text-xs font-semibold">{team.label}</span>
          <ul class="flex flex-1 flex-wrap gap-x-2.5 gap-y-1">
            {#each team.members as p (p.userId)}
              {@const isMe = p.userId === myUserId}
              <li class="flex items-center gap-1 text-xs">
                <UserAvatar size="xs" avatarKey={p.avatarKey} displayName={p.displayName ?? '?'} />
                <span class={isMe ? 'font-semibold' : 'text-muted-foreground'}>
                  {p.displayName ?? p.userId}{isMe ? ' (you)' : ''}
                </span>
                <span
                  class="rounded bg-muted px-1 text-[10px] font-medium leading-tight text-muted-foreground"
                >
                  {p.weight ?? '—'}
                </span>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>
  </div>
{/if}

<script lang="ts">
  import UserAvatar from '$lib/components/UserAvatar.svelte';
  import type { GroupPickEntry } from '$lib/types/picks';
  import type { PickGame } from '$lib/types/games';

  // ADR-0023: the week's All-In "signature moment" board. Every locked All-In
  // (weight='A') is revealed to the whole group the moment it locks — pre-kickoff
  // — including the caller's own, for symmetry. The reveal is enforced server-side
  // by the all_in_declarations RPC; this component only renders what it returns.
  interface Props {
    declarations: GroupPickEntry[];
    games?: PickGame[];
    myUserId?: string | null;
  }
  let { declarations, games = [], myUserId = null }: Props = $props();

  const gameById = $derived(new Map(games.map((g) => [g.id, g])));

  type GameGroup = {
    gameId: string;
    label: string;
    kickoff: string | null;
    members: GroupPickEntry[];
  };

  // Current user first, then alphabetical by display name.
  function sortMembers(a: GroupPickEntry, b: GroupPickEntry) {
    if (a.userId === myUserId) return -1;
    if (b.userId === myUserId) return 1;
    return (a.displayName ?? '').localeCompare(b.displayName ?? '');
  }

  const groups = $derived.by(() => {
    const byGame: Record<string, GameGroup> = {};
    for (const d of declarations) {
      const g = gameById.get(d.gameId);
      const group = (byGame[d.gameId] ??= {
        gameId: d.gameId,
        label: g ? `${g.away} @ ${g.home}` : '—',
        kickoff: g?.kickoff ?? null,
        members: []
      });
      group.members.push(d);
    }
    const list = Object.values(byGame);
    for (const grp of list) grp.members.sort(sortMembers);
    // Kickoff order (unknown kickoffs last), then matchup label.
    list.sort((a, b) => {
      const ka = a.kickoff ? new Date(a.kickoff).getTime() : Infinity;
      const kb = b.kickoff ? new Date(b.kickoff).getTime() : Infinity;
      if (ka !== kb) return ka - kb;
      return a.label.localeCompare(b.label);
    });
    return list;
  });
</script>

<section class="mt-4 rounded-lg border bg-card p-3" data-testid="all-in-declarations">
  <h2 class="mb-2 flex items-center gap-1.5 text-sm font-semibold">
    <span aria-hidden="true">🐳</span> This week's All-Ins
  </h2>

  {#if groups.length === 0}
    <p class="text-xs text-muted-foreground">
      No All-Ins declared yet. Lock an All-In and the whole group sees it — before kickoff.
    </p>
  {:else}
    <ul class="space-y-2">
      {#each groups as group (group.gameId)}
        <li>
          <p class="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {group.label}
          </p>
          <ul class="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {#each group.members as d (d.userId)}
              {@const isMe = d.userId === myUserId}
              <li class="flex items-center gap-1 text-xs" data-testid="all-in-entry">
                <UserAvatar size="xs" avatarKey={d.avatarKey} displayName={d.displayName ?? '?'} />
                <span class={isMe ? 'font-semibold' : 'text-muted-foreground'}>
                  {d.displayName ?? d.userId}{isMe ? ' (you)' : ''}
                </span>
                <span class="text-muted-foreground">on</span>
                <span class="font-semibold">{d.pickedTeamShort ?? '—'}</span>
                <span
                  class="rounded bg-primary/10 px-1 text-[10px] leading-tight font-semibold text-primary-ink uppercase"
                >
                  All-In
                </span>
              </li>
            {/each}
          </ul>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<script lang="ts">
  import UserAvatar from '$lib/components/UserAvatar.svelte';
  import type { PickStatusBoardEntry } from '$lib/types/picks';

  // ADR-0019 counts-only status carve-out (#388): the group-visible "who's picked"
  // board for the active week. Shows each active member's picks-made-vs-available
  // COUNT (e.g. 9/13) and whether they're done — never which games or sides anyone
  // picked. The counts come from the security-definer picks_status_board RPC; this
  // component only renders what it returns.
  interface Props {
    board: PickStatusBoardEntry[];
    myUserId?: string | null;
  }
  let { board, myUserId = null }: Props = $props();

  // Laggards first (still picking), then finished; you're pinned to the top of your
  // bucket, everyone else alphabetical. Surfacing who's outstanding is the whole
  // point — "waiting on Hank".
  const sorted = $derived(
    [...board].sort((a, b) => {
      if (a.isComplete !== b.isComplete) return a.isComplete ? 1 : -1;
      if (a.userId === myUserId) return -1;
      if (b.userId === myUserId) return 1;
      return (a.displayName ?? '').localeCompare(b.displayName ?? '');
    })
  );

  const doneCount = $derived(board.filter((m) => m.isComplete).length);
</script>

<!-- Solo groups have no one to wait on — the summary bar already covers you. -->
{#if board.length > 1}
  <section class="mt-4 rounded-lg border bg-card p-3" data-testid="picks-status-board">
    <h2 class="mb-2 flex items-center gap-1.5 text-sm font-semibold">
      <span aria-hidden="true">📋</span> Who's picked
      <span class="ml-auto text-xs font-normal text-muted-foreground" data-testid="status-summary">
        {doneCount}/{board.length} done
      </span>
    </h2>
    <ul class="space-y-1">
      {#each sorted as m (m.userId)}
        {@const isMe = m.userId === myUserId}
        <li
          class="flex items-center gap-2 text-xs"
          data-testid="status-row"
          data-user-id={m.userId}
        >
          <UserAvatar size="xs" avatarKey={m.avatarKey} displayName={m.displayName ?? '?'} />
          <span class={isMe ? 'font-semibold' : 'text-muted-foreground'}>
            {m.displayName ?? m.userId}{isMe ? ' (you)' : ''}
          </span>
          <span class="ml-auto font-semibold tabular-nums" data-testid="status-count">
            {m.picksMade}/{m.gamesAvailable}
          </span>
          {#if m.isComplete}
            <span class="text-success" data-testid="status-done" aria-label="all picks in">✓</span>
          {:else}
            <span class="text-warning" data-testid="status-pending">picking…</span>
          {/if}
        </li>
      {/each}
    </ul>
  </section>
{/if}

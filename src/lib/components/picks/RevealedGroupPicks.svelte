<script lang="ts">
  import type { GroupPickEntry } from '$lib/types/picks';

  interface Props {
    picks: GroupPickEntry[];
    myUserId: string;
  }
  let { picks, myUserId }: Props = $props();

  const others = $derived(picks.filter((p) => p.userId !== myUserId));
  const me = $derived(picks.find((p) => p.userId === myUserId));
</script>

{#if picks.length > 0}
  <div class="mt-2 border-t pt-2">
    <p class="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      Group picks
    </p>
    <ul class="space-y-0.5">
      {#if me}
        <li class="flex items-center justify-between text-xs">
          <span class="font-medium">{me.displayName ?? 'You'} (you)</span>
          <span class="text-muted-foreground">
            {me.pickedTeamShort ?? '—'} · {me.weight ?? '—'}
          </span>
        </li>
      {/if}
      {#each others as p (p.userId)}
        <li class="flex items-center justify-between text-xs">
          <span class="text-muted-foreground">{p.displayName ?? p.userId}</span>
          <span class="text-muted-foreground">
            {p.pickedTeamShort ?? '—'} · {p.weight ?? '—'}
          </span>
        </li>
      {/each}
    </ul>
  </div>
{/if}

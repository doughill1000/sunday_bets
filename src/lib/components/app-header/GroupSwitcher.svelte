<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator
  } from '$lib/components/ui/dropdown-menu';
  import { Button } from '$lib/components/ui/button';

  interface Membership {
    groupId: string;
    groupName: string;
    role: string;
  }

  interface Props {
    memberships: Membership[];
    activeGroupId: string | null;
  }

  let { memberships, activeGroupId }: Props = $props();

  // Only render when the user belongs to more than one group.
  const activeGroup = $derived(
    memberships.find((m) => m.groupId === activeGroupId) ?? memberships[0]
  );

  async function switchGroup(groupId: string) {
    if (groupId === activeGroupId) return;

    await fetch('/api/groups/switch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ groupId })
    });

    // Reload all server data so picks/leaderboard reflect the new active group.
    await invalidateAll();
    await goto(window.location.pathname, { replaceState: true });
  }
</script>

{#if memberships.length > 1}
  <DropdownMenu>
    <DropdownMenuTrigger>
      <Button
        variant="outline"
        size="sm"
        class="max-w-[120px] truncate text-xs sm:max-w-[160px] sm:text-sm"
        aria-label="Switch active group"
        data-testid="group-switcher-trigger"
      >
        {activeGroup?.groupName ?? 'Group'}
        <svg
          class="ml-1 h-3 w-3 shrink-0 opacity-60"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clip-rule="evenodd"
          />
        </svg>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="w-48">
      <DropdownMenuLabel class="text-xs text-muted-foreground">Switch group</DropdownMenuLabel>
      <DropdownMenuSeparator />
      {#each memberships as membership (membership.groupId)}
        <DropdownMenuItem
          class="cursor-pointer"
          data-testid="group-switcher-option"
          data-group-id={membership.groupId}
          onclick={() => switchGroup(membership.groupId)}
        >
          <span class="flex-1 truncate">{membership.groupName}</span>
          {#if membership.groupId === activeGroupId}
            <svg
              class="ml-2 h-4 w-4 shrink-0 text-primary"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                clip-rule="evenodd"
              />
            </svg>
          {/if}
        </DropdownMenuItem>
      {/each}
    </DropdownMenuContent>
  </DropdownMenu>
{/if}

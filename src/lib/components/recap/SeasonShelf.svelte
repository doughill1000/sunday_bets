<script lang="ts">
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
  } from '$lib/components/ui/card';
  import Medal from '@lucide/svelte/icons/medal';
  import type { SeasonShelfEntry } from '$lib/domain/weeklyAwards';

  let {
    shelf,
    currentUserId = null
  }: { shelf: SeasonShelfEntry[]; currentUserId?: string | null } = $props();

  function nameFor(userId: string, displayName: string): string {
    return userId === currentUserId ? `${displayName} (you)` : displayName;
  }
</script>

<Card data-testid="season-shelf">
  <CardHeader>
    <CardTitle class="flex items-center gap-2">
      <Medal class="size-4 shrink-0 text-primary-ink" aria-hidden="true" />
      Trophy shelf
    </CardTitle>
    <CardDescription>Weekly hardware won this season.</CardDescription>
  </CardHeader>
  <CardContent>
    <ul class="space-y-3">
      {#each shelf as entry (entry.user_id)}
        <li class="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
          <span class="truncate text-sm font-medium sm:w-32 sm:shrink-0">
            {nameFor(entry.user_id, entry.display_name)}
          </span>
          <ul class="flex flex-wrap gap-1.5">
            {#each entry.awards as award (award.id)}
              <li
                class="flex items-center gap-1.5 rounded-full border bg-muted/40 py-0.5 pr-2.5 pl-2 text-xs"
                data-testid="shelf-chip-{award.id}"
              >
                <span aria-hidden="true">{award.emoji}</span>
                <span class="font-medium">
                  {#if award.count > 1}<span class="tabular-nums">{award.count}×</span>
                  {/if}{award.short}
                </span>
              </li>
            {/each}
          </ul>
        </li>
      {/each}
    </ul>
  </CardContent>
</Card>

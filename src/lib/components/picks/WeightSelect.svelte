<script lang="ts">
  import { ToggleGroup, ToggleGroupItem } from '$lib/components/ui/toggle-group';
  import { Label } from '$lib/components/ui/label';
  import { Button } from '$lib/components/ui/button';
  import { WEIGHTS, type WeightCode } from '$lib/types/domain';
  import { setWeight, stageFavorite, usePicksStore } from '$lib/stores/picks';
  import { unlockPick as unlockPickApi } from '$lib/api/picks';
  import { allInIntent, type AllInIntent } from '$lib/domain/rules';
  import { favoriteSide } from '$lib/domain/spread';
  import { toast } from 'svelte-sonner';
  import type { PickGame } from '$lib/types/games';

  interface Props {
    gameId: string;
    games?: PickGame[];
    canChange?: boolean;
    selectedWeight?: WeightCode;
    isLastWeek?: boolean;
    finalWeekUnlimitedAllin?: boolean;
  }

  let {
    gameId,
    games = [],
    canChange = false,
    selectedWeight = undefined,
    isLastWeek = false,
    finalWeekUnlimitedAllin = true
  }: Props = $props();

  const picks = usePicksStore();

  // Local mirror of the committed weight so an un-confirmed All-In tap doesn't
  // visually "stick" before the user confirms (cancel restores this value).
  let value = $state<WeightCode | undefined>(selectedWeight);
  $effect(() => {
    value = selectedWeight;
  });

  // null = no open prompt; otherwise the resolved All-In intent awaiting the user.
  let pending = $state<AllInIntent | null>(null);

  const intent = $derived(allInIntent(gameId, games, $picks, isLastWeek, finalWeekUnlimitedAllin));
  const allInBlocked = $derived(intent.kind === 'blocked');
  const blockedBy = $derived(intent.kind === 'blocked' ? intent.from : null);

  function nameFor(g: PickGame, team: 'home' | 'away') {
    return team === 'home' ? g.home : g.away;
  }

  const thisName = $derived.by(() => {
    const g = games.find((x) => x.id === gameId);
    if (!g) return 'this game';
    const t = $picks[gameId]?.selected?.team ?? $picks[gameId]?.lockedPick?.team;
    return t ? nameFor(g, t) : `${g.away} @ ${g.home}`;
  });
  const heldName = $derived(
    pending?.kind === 'move' ? nameFor(pending.from.game, pending.from.team) : ''
  );

  function onValueChange(val: string | undefined) {
    const code = (val ?? undefined) as WeightCode | undefined;
    if (!code) {
      // Toggling the active item off — keep the committed weight.
      value = selectedWeight;
      return;
    }
    if (code === 'A') {
      // Don't commit yet: open the right prompt and hold 'A' off the toggle.
      value = selectedWeight;
      if (intent.kind === 'blocked') return; // can't move; item is disabled anyway
      pending = intent;
      return;
    }
    pending = null;
    setWeight(gameId, code, picks);
  }

  function confirmAllIn() {
    pending = null;
    setWeight(gameId, 'A', picks);
  }

  async function moveAllIn() {
    if (pending?.kind !== 'move') return;
    const held = pending.from;
    pending = null;
    // Clear the held game server-side if it was saved, then re-stage its favorite.
    if (held.locked) {
      const res = await unlockPickApi(held.game.id);
      if (!res.ok) {
        toast.error('Couldn’t move All-In — try again');
        return;
      }
    }
    stageFavorite(held.game.id, favoriteSide(held.game), picks);
    setWeight(gameId, 'A', picks);
  }

  function cancelAllIn() {
    pending = null;
    value = selectedWeight;
  }
</script>

<div class="grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr,auto]">
  <div class="min-w-0">
    <Label class="mb-1 block text-xs" for={`w_${gameId}`}>Weight</Label>

    <ToggleGroup
      id={`w_${gameId}`}
      type="single"
      bind:value
      {onValueChange}
      class="flex w-full gap-1"
      disabled={!canChange}
    >
      {#each Object.entries(WEIGHTS) as [code, w] (code)}
        <ToggleGroupItem
          value={code}
          disabled={code === 'A' && allInBlocked}
          class="flex-1 rounded-md border bg-muted/40 px-3 py-[6px] leading-none transition
                 hover:bg-muted/60
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
                 disabled:pointer-events-none disabled:opacity-70
                 data-[state=on]:border-primary data-[state=on]:text-primary
                 data-[state=on]:shadow-sm"
        >
          <div class="flex flex-col items-center">
            <span class="text-sm font-semibold">{w.label}</span>
            <span class="mt-[1px] text-[10px] opacity-80">{w.points}</span>
          </div>
        </ToggleGroupItem>
      {/each}
    </ToggleGroup>

    {#if pending?.kind === 'confirm'}
      <div class="mt-2 rounded-md border border-primary/40 bg-primary/5 p-2 text-xs">
        <p class="mb-2 font-medium">Confirm All-In? That's 10 points riding on one game.</p>
        <div class="flex gap-2">
          <Button class="h-8 flex-1 text-xs font-semibold" onclick={confirmAllIn}>
            Confirm All-In
          </Button>
          <Button variant="outline" class="h-8 flex-1 text-xs" onclick={cancelAllIn}>Cancel</Button>
        </div>
      </div>
    {:else if pending?.kind === 'move'}
      <div class="mt-2 rounded-md border border-warning/40 bg-warning/5 p-2 text-xs">
        <p class="mb-2 font-medium">
          Move All-In from {heldName} to {thisName}? {heldName}'s pick will be cleared.
        </p>
        <div class="flex gap-2">
          <Button class="h-8 flex-1 text-xs font-semibold" onclick={moveAllIn}>Move All-In</Button>
          <Button variant="outline" class="h-8 flex-1 text-xs" onclick={cancelAllIn}>Cancel</Button>
        </div>
      </div>
    {:else if canChange && allInBlocked && blockedBy}
      <p class="mt-1 text-[11px] text-muted-foreground">
        All-In is locked on {nameFor(blockedBy.game, blockedBy.team)} (already kicked off).
      </p>
    {/if}
  </div>
</div>

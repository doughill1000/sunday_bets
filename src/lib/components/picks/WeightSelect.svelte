<script lang="ts">
  import { ToggleGroup, ToggleGroupItem } from '$lib/components/ui/toggle-group';
  import { Label } from '$lib/components/ui/label';
  import { WEIGHTS, type WeightCode } from '$lib/types/domain';
  import { setWeight } from '$lib/stores/picks';

  export let gameId: string;
  export let canChange = false;
  export let canUseAllIn = true;
  export let selectedWeight: WeightCode = 'L';
  export let showAllInHint = false;
</script>

<div class="grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr,auto]">
  <div class="min-w-0">
    <Label class="mb-1 block text-xs" for={`w_${gameId}`}>Weight</Label>

    <ToggleGroup
      id={`w_${gameId}`}
      type="single"
      value={selectedWeight}
      onValueChange={(val) => setWeight(gameId, (val ?? 'L') as WeightCode)}
      class="w-full"
      disabled={!canChange}
    >
      {#each Object.entries(WEIGHTS) as [code, w]}
        <ToggleGroupItem
          value={code}
          disabled={code === 'A' && !canUseAllIn}
          class="flex-1 px-3 py-[6px] leading-none"
        >
          <div class="flex flex-col items-center">
            <span class="text-sm font-semibold">{w.label}</span>
            <span class="mt-[1px] text-[10px] opacity-80">{w.points}</span>
          </div>
        </ToggleGroupItem>
      {/each}
    </ToggleGroup>

    {#if showAllInHint}
      <p class="mt-1 text-[11px] text-muted-foreground">
        {WEIGHTS.A.label} has already been used on another game.
      </p>
    {/if}
  </div>
</div>

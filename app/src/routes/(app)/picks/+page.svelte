<script lang="ts">
  import { onMount } from 'svelte';

  // shadcn-svelte
  import { Card, CardHeader, CardContent } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import { ToggleGroup, ToggleGroupItem } from '$lib/components/ui/toggle-group';
  import { Label } from '$lib/components/ui/label';
  import { toast } from 'svelte-sonner';

  import { picks, setPicks, selectTeam, setWeight } from '$lib/stores/picks';
  import { lockPick as lockPickApi, unlockPick as unlockPickApi } from '$lib/api/picks';
  import { TEAM_META, WEIGHTS, type TeamSide, type WeightCode } from '$lib/types/domain';
  import type { UIGame } from '$lib/types/ui';
  import { textOn } from '$lib/ui/color';
  import { kickoffPassed, canUseAce as canUseAceRule } from '$lib/domain/rules';
  import type { PickEntry } from '$lib/types/server';

  export let data: { games: UIGame[]; picks: Record<string, PickEntry> };

  const games = data.games ?? [];
  let initialized = false;

  onMount(() => {
    if (!initialized && data?.picks) {
      setPicks(data.picks);
      for (const g of games) {
        const entry = $picks[g.id];
        const hasSelection = entry?.selected || entry?.lockedPick;
        if (!hasSelection) selectTeam(g.id, 'home');
      }
      initialized = true;
    }
  });

  function teamVars(abbr: string) {
    const meta = TEAM_META[abbr] ?? {
      name: abbr,
      colors: ['#64748b', '#94a3b8'] as [string, string]
    };
    const [c1, c2] = meta.colors;
    const fg = textOn(c1, c2);
    return `--c1:${c1};--c2:${c2};--fg:${fg}`;
  }

  async function onLock(g: UIGame) {
    const entry = $picks[g.id] ?? {};
    const team = (entry.selected?.team ?? entry.lockedPick?.team) as TeamSide | undefined;
    const weight = (entry.selected?.weight ?? entry.lockedPick?.weight) as WeightCode | undefined;

    if (!team || !weight) {
      // was toast.success by mistake
      toast.error('Pick a team and weight first.');
      return;
    }
    const res = await lockPickApi(g.id, team, weight);
    if (!res.ok) {
      toast.error(res.reason ?? 'Lock failed');
      return;
    }
    picks.update((s) => ({
      ...s,
      [g.id]: {
        ...(s[g.id] ?? {}),
        lockedPick: { team, weight }
      }
    }));
  }

  async function onUnlock(g: UIGame) {
    const res = await unlockPickApi(g.id);
    if (!res.ok) {
      toast.error('Unlock failed');
      return;
    }
    picks.update((s) => ({
      ...s,
      [g.id]: {
        ...(s[g.id] ?? {}),
        lockedPick: undefined
      }
    }));
  }

  function formatKickoff(iso: string) {
    const d = new Date(iso);
    const dow = d.toLocaleDateString(undefined, { weekday: 'short' });
    const date = d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
    const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `${dow} ${date} ${time}`;
  }

  function spreadLine(g: UIGame): string {
    if (g.spreadValue == null) return 'No line';
    if (g.spreadValue === 0) return 'PK';

    const favIsHome = g.spreadTeamId === g.homeTeamId;
    const favName = favIsHome ? g.home : g.away;
    return `${favName} -${g.spreadValue}`;
  }

  function signedSpreadForTeam(g: UIGame, team: 'home' | 'away'): string {
    if (g.spreadValue == null) return '';
    if (g.spreadValue === 0) return ' PK';

    const favIsHome = g.spreadTeamId === g.homeTeamId;
    const teamIsFav = (team === 'home') === favIsHome;
    return ` ${teamIsFav ? '-' : '+'}${g.spreadValue}`;
  }
</script>

<h1 class="mb-4 text-2xl font-semibold">My Picks</h1>

{#if games.length === 0}
  <p class="opacity-70">No scheduled games for the active week.</p>
{:else}
  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {#each games as g (g.id)}
      {@const entry = $picks[g.id] ?? {}}
      {@const current = entry.selected ?? entry.lockedPick}
      {@const started = kickoffPassed(g.kickoff)}
      {@const locked = !!entry.lockedPick}
      {@const canChange = !started && !locked}
      {@const canUseAce = canUseAceRule(g.id, $picks)}

      <!-- team css vars, memoized -->
      {@const awayVars = teamVars(g.away)}
      {@const homeVars = teamVars(g.home)}

      {@const selAway = current?.team === 'away'}
      {@const selHome = current?.team === 'home'}
      {@const weightValue = (current?.weight ?? 'L') as WeightCode}
      {@const lineText = spreadLine(g)}
      {@const kickoffText = formatKickoff(g.kickoff)}

      <Card class="relative rounded-2xl">
        {#if locked}
          <Badge
            variant="secondary"
            class="absolute right-3 top-3 z-10 flex flex-col items-end px-2 py-1 text-[11px]"
          >
            <span>Locked</span>
            <span class="font-normal opacity-80">
              {#if entry.lockedPick}
                {entry.lockedPick.team === 'home' ? g.home : g.away}
                {signedSpreadForTeam(g, entry.lockedPick.team)}
                @ {entry.lockedPick.weight}
              {/if}
            </span>
          </Badge>
        {/if}

        <CardHeader class="flex-row items-center justify-between pb-2">
          <div class="min-w-0">
            <h2 class="truncate font-semibold">{g.away} @ {g.home}</h2>
            <p class="text-muted-foreground truncate text-xs">{lineText}</p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <time class="text-muted-foreground whitespace-nowrap text-xs" datetime={g.kickoff}>
              {kickoffText}
            </time>
          </div>
        </CardHeader>

        <CardContent class="space-y-3">
          <!-- Team pick -->
          <div class="flex gap-2" role="group" aria-label="Pick a team">
            <Button
              variant="secondary"
              class={`team-btn flex-1 ${selAway ? 'selected' : ''}`}
              style={awayVars}
              aria-pressed={selAway}
              disabled={!canChange}
              onclick={() => selectTeam(g.id, 'away')}
            >
              <span class="font-semibold tracking-wide">{g.away}</span>
            </Button>

            <Button
              variant="secondary"
              class={`team-btn flex-1 ${selHome ? 'selected' : ''}`}
              style={homeVars}
              aria-pressed={selHome}
              disabled={!canChange}
              onclick={() => selectTeam(g.id, 'home')}
            >
              <span class="font-semibold tracking-wide">{g.home}</span>
            </Button>
          </div>

          <!-- Weight + Lock -->
          <div class="grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr,auto]">
            <div class="min-w-0">
              <Label class="mb-1 block text-xs" for={`w_${g.id}`}>Weight</Label>

              <ToggleGroup
                id={`w_${g.id}`}
                type="single"
                value={weightValue}
                onValueChange={(val) => setWeight(g.id, (val ?? 'L') as WeightCode)}
                class="w-full"
                disabled={!canChange}
              >
                {#each Object.entries(WEIGHTS) as [code, w]}
                  <ToggleGroupItem
                    value={code}
                    disabled={code === 'A' && !canUseAce}
                    class="flex-1 px-3 py-[6px] leading-none"
                  >
                    <div class="flex flex-col items-center">
                      <span class="text-sm font-semibold">{w.label}</span>
                      <span class="mt-[1px] text-[10px] opacity-80">{w.points}</span>
                    </div>
                  </ToggleGroupItem>
                {/each}
              </ToggleGroup>

              {#if entry.selected?.weight === 'A' && !canUseAce}
                <p class="text-muted-foreground mt-1 text-[11px]">
                  {WEIGHTS.A.label} has already been used on another game.
                </p>
              {/if}
            </div>

            <div class="mt-1 flex gap-2">
              {#if locked}
                <Button
                  class="h-10 w-full font-semibold"
                  variant="outline"
                  onclick={() => onUnlock(g)}
                  disabled={started}
                >
                  Unlock
                </Button>
              {:else}
                <Button
                  class="h-10 w-full font-semibold"
                  onclick={() => onLock(g)}
                  disabled={!entry.selected ||
                    (entry.selected.weight === 'A' && !canUseAce) ||
                    started}
                >
                  Lock Pick
                </Button>
              {/if}
            </div>

            {#if started}
              <p class="text-muted-foreground mt-2 text-xs">Kickoff passed — picks locked.</p>
            {/if}
          </div>
        </CardContent>
      </Card>
    {/each}
  </div>
{/if}

<style>
  :global(.team-btn) {
    --c1: #64748b;
    --c2: #94a3b8;
    --fg: #000;
    background: linear-gradient(135deg, var(--c1), var(--c2));
    color: var(--fg);
    border: 1px solid hsl(var(--border));
  }
  :global(.team-btn.selected) {
    outline: 2px solid white;
    outline-offset: 2px;
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--c1) 60%, white 40%) inset;
  }
</style>

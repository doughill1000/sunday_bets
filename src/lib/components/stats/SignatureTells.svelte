<script lang="ts">
  // Signature tells list (issue #564, extracted for #567): reads the player's strongest
  // already-computed cuts back to them as plain sentences — "You keep fading DAL", "You lean
  // underdog", "You beat the market in primetime". The pure `signatureTendencies` util decides
  // WHICH tells and their rank; this component only writes the English (subject conjugation,
  // sentence per kind). It carries no Card/header of its own — `StatsHero` owns the framing and
  // the scope label — so the tells fold into the one scope-aware hero without nesting cards.
  import { formatAccuracy } from '$lib/utils/stats';
  import type { SignatureTell } from '$lib/utils/stats';
  import type { SituationalDimension } from '$lib/types/server/stats';

  let {
    tells,
    isYou,
    displayName
  }: {
    tells: SignatureTell[];
    isYou: boolean;
    displayName: string;
  } = $props();

  const subjectCap = $derived(isYou ? 'You' : displayName);
  const subject = $derived(isYou ? 'you' : displayName);
  const possessive = $derived(isYou ? 'Your' : `${displayName}'s`);
  // Present-tense verb agreement: "You keep" but "Colin keeps".
  const verb = (base: string) => (isYou ? base : `${base}s`);

  const DIMENSION_GLYPH: Record<SituationalDimension, string> = {
    primetime: 'P',
    home_away: 'H',
    spread: 'S',
    divisional: 'D'
  };

  const TONE_CLASS: Record<string, string> = {
    gold: 'bg-primary/15 text-primary',
    sky: 'bg-chart-2/15 text-chart-2',
    success: 'bg-success/15 text-success',
    destructive: 'bg-destructive/15 text-destructive'
  };

  const STAT_TONE_CLASS: Record<string, string> = {
    gold: 'text-primary',
    sky: 'text-chart-2',
    success: 'text-success',
    destructive: 'text-destructive'
  };

  // Stable {#each} key per tell — distinct across kinds even if two tells tie on `score`.
  const tellKey = (tell: SignatureTell) =>
    tell.kind === 'team'
      ? `team:${tell.side}:${tell.teamShort}`
      : tell.kind === 'lean'
        ? `lean:${tell.lean}`
        : `situational:${tell.dimension}:${tell.bucket}`;

  const pct = (value: number) => `${Math.round(value * 100)}%`;
  const deltaLabel = (delta: number) =>
    `${delta >= 0 ? '+' : '−'}${Math.round(Math.abs(delta) * 100)}%`;
  const lowerFirst = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);

  type TellView = {
    glyph: string;
    tone: string;
    sentence: string;
    stat: string;
    statTone: string;
    sub: string;
  };

  function describe(tell: SignatureTell): TellView {
    if (tell.kind === 'team') {
      const fading = tell.side === 'faded';
      return {
        glyph: tell.teamShort.slice(0, 1),
        tone: fading ? 'sky' : 'gold',
        sentence: `${subjectCap} ${verb('keep')} ${fading ? 'fading' : 'riding'} ${tell.teamShort}`,
        stat: `${tell.wins}-${tell.losses}`,
        statTone: fading ? 'sky' : 'gold',
        sub: `${fading ? 'best fade' : 'best ride'} · ${formatAccuracy(tell.cover)} ${
          fading ? 'against them' : 'cover'
        }`
      };
    }
    if (tell.kind === 'lean') {
      const dog = tell.lean === 'underdogs';
      return {
        glyph: dog ? 'U' : 'F',
        tone: 'gold',
        sentence: `${subjectCap} ${verb('lean')} ${dog ? 'underdog' : 'chalk'}`,
        stat: pct(tell.leanPct),
        statTone: 'gold',
        sub: `of ${possessive.toLowerCase()} picks take the ${dog ? 'dog' : 'favorite'}`
      };
    }
    const beating = tell.delta >= 0;
    return {
      glyph: DIMENSION_GLYPH[tell.dimension],
      tone: beating ? 'success' : 'destructive',
      sentence: `${subjectCap} ${verb(beating ? 'beat' : 'trail')} the market ${lowerFirst(tell.label)}`,
      stat: deltaLabel(tell.delta),
      statTone: beating ? 'success' : 'destructive',
      sub: `${subject} ${formatAccuracy(tell.accuracy)} vs market ${formatAccuracy(tell.leagueAccuracy)}`
    };
  }
</script>

{#if tells.length === 0}
  <p class="text-sm text-muted-foreground">
    {possessive} signature emerges as {isYou ? 'you build' : `${displayName} builds`} up more history
    — a team, lean, or situational edge shows here once it clears its sample guard.
  </p>
{:else}
  <ul class="space-y-2.5">
    {#each tells as tell (tellKey(tell))}
      {@const view = describe(tell)}
      <li class="grid grid-cols-[1.4rem_1fr_auto] items-center gap-x-2.5 gap-y-0.5">
        <span
          class="row-span-2 grid h-6 w-6 place-items-center rounded-md text-[0.7rem] font-extrabold {TONE_CLASS[
            view.tone
          ]}"
          aria-hidden="true"
        >
          {view.glyph}
        </span>
        <span class="text-sm font-semibold tracking-tight">{view.sentence}</span>
        <span
          class="text-right font-mono text-sm font-bold tabular-nums {STAT_TONE_CLASS[
            view.statTone
          ]}"
        >
          {view.stat}
        </span>
        <span class="col-span-2 font-mono text-[0.65rem] text-muted-foreground">{view.sub}</span>
      </li>
    {/each}
  </ul>
{/if}

// src/lib/domain/rules.ts
import type { PickEntry } from '$lib/types/picks';
import type { PickGame } from '$lib/types/games';
import type { TeamSide } from '$lib/types/domain';

export function kickoffPassed(iso: string, now = Date.now()) {
  return new Date(iso).getTime() <= now;
}

export type PickStatus = 'saved' | 'open' | 'missed';

/** Status of a single game's pick: saved wins even past kickoff, then missed, else open. */
export function pickStatus(
  entry: PickEntry | undefined,
  kickoff: string,
  now = Date.now()
): PickStatus {
  if (entry?.lockedPick) return 'saved';
  if (kickoffPassed(kickoff, now)) return 'missed';
  return 'open';
}

/** The game currently holding the week's single All-In (saved or merely staged). */
export type AllInHolder = {
  game: PickGame;
  team: TeamSide;
  /** true when it's a saved/locked All-In; false when it's only a staged selection. */
  locked: boolean;
};

/**
 * Resolve which game holds the week's All-In, if any. A locked All-In takes
 * precedence over a merely-staged one. Shared by the summary bar and the
 * WeightSelect move-with-confirm prompt.
 */
export function findAllInHolder(
  games: PickGame[],
  all: Record<string, PickEntry>
): AllInHolder | null {
  for (const g of games) {
    const lp = all[g.id]?.lockedPick;
    if (lp?.weight === 'A') return { game: g, team: lp.team, locked: true };
  }
  for (const g of games) {
    const sel = all[g.id]?.selected;
    if (sel?.weight === 'A' && sel.team) return { game: g, team: sel.team, locked: false };
  }
  return null;
}

/**
 * What tapping All-In on `gameId` should do, given the current board:
 * - `confirm`  — no other holder (or final-week-unlimited): a simple "Confirm All-In?".
 * - `move`     — another game holds it pre-kickoff: prompt to move (clearing the held game).
 * - `blocked`  — another game's All-In has already kicked off and is final: can't move.
 *
 * Repurposes the old `canUseAllInRule` boolean into a richer intent.
 */
export type AllInIntent =
  | { kind: 'confirm' }
  | { kind: 'move'; from: AllInHolder }
  | { kind: 'blocked'; from: AllInHolder };

export function allInIntent(
  gameId: string,
  games: PickGame[],
  all: Record<string, PickEntry>,
  isLastWeek = false,
  finalWeekUnlimitedAllin = true
): AllInIntent {
  if (isLastWeek && finalWeekUnlimitedAllin) return { kind: 'confirm' };
  const holder = findAllInHolder(games, all);
  if (!holder || holder.game.id === gameId) return { kind: 'confirm' };
  if (kickoffPassed(holder.game.kickoff)) return { kind: 'blocked', from: holder };
  return { kind: 'move', from: holder };
}

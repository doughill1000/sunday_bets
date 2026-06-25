// src/lib/stores/picks.ts
import { getContext, hasContext, setContext } from 'svelte';
import { writable, get, type Writable } from 'svelte/store';
import type { PickEntry } from '$lib/types/picks';
import type { TeamSide, WeightCode } from '$lib/types/domain';
import { lockPick as lockPickPost } from '$lib/api/picks';

export const picks = writable<Record<string, PickEntry>>({});

const PICKS_STORE = Symbol('picks-store');

export type PicksStore = Writable<Record<string, PickEntry>>;

/** Trailing debounce window for auto-save. Coalesces rapid L→M→H toggles into one RPC. */
export const SAVE_DEBOUNCE_MS = 700;

// Module-level, keyed by gameId. Safe because gameIds are unique across a board.
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
// Per-game generation counter so a stale in-flight response can't clobber newer state.
const saveSeq = new Map<string, number>();

export function providePicksStore(initialPicks: Record<string, PickEntry>): PicksStore {
  const store = writable(initialPicks);
  setContext(PICKS_STORE, store);
  if (typeof window !== 'undefined') picks.set(initialPicks);
  return store;
}

export function usePicksStore(): PicksStore {
  return hasContext(PICKS_STORE) ? getContext<PicksStore>(PICKS_STORE) : picks;
}

export function setPicks(data: Record<string, PickEntry>) {
  picks.set(data);
}

/**
 * Stage a team. Sets only the team half of `selected`, preserving any existing
 * weight, then schedules an auto-save (a no-op until a weight is also present).
 */
export function selectTeam(gameId: string, team: TeamSide, store: PicksStore = picks) {
  store.update((s) => {
    const e = s[gameId] ?? {};
    return { ...s, [gameId]: { ...e, selected: { ...e.selected, team } } };
  });
  scheduleSave(gameId, store);
}

/**
 * Stage a weight. Sets only the weight half of `selected`, preserving any existing
 * team, then schedules an auto-save.
 */
export function setWeight(gameId: string, weight: WeightCode, store: PicksStore = picks) {
  store.update((s) => {
    const e = s[gameId] ?? {};
    return { ...s, [gameId]: { ...e, selected: { ...e.selected, weight } } };
  });
  scheduleSave(gameId, store);
}

/**
 * Schedule a trailing-debounced save for one game. Repeated calls within the
 * window reset the timer so rapid toggling fires a single RPC.
 */
export function scheduleSave(gameId: string, store: PicksStore = picks) {
  const existing = saveTimers.get(gameId);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    saveTimers.delete(gameId);
    void lockPick(gameId, store);
  }, SAVE_DEBOUNCE_MS);
  saveTimers.set(gameId, timer);
}

/** Cancel any pending debounced save for a game (used when clearing/replacing it). */
function cancelSave(gameId: string) {
  const existing = saveTimers.get(gameId);
  if (existing) {
    clearTimeout(existing);
    saveTimers.delete(gameId);
  }
}

/**
 * Save the game's staged pick to the server. Reads the latest selection at call
 * time, so a debounced fire always persists the final toggle value. Used both by
 * the auto-save scheduler and by the manual Retry action.
 *
 * - Does NOT optimistically set `lockedPick`: the card stays on the board showing
 *   `Saving…` until the server confirms, avoiding a collapse-then-reappear flicker
 *   on failure.
 * - On failure, restores only this game's entry (not the whole store) and surfaces
 *   the RPC reason via `saveError`.
 * - A per-game sequence guard drops stale responses (last write wins).
 */
export async function lockPick(
  gameId: string,
  store: PicksStore = picks
): Promise<{ ok: boolean; reason?: string }> {
  const before = get(store)[gameId];
  const team = (before?.selected?.team ?? before?.lockedPick?.team) as TeamSide | undefined;
  const weight = (before?.selected?.weight ?? before?.lockedPick?.weight) as WeightCode | undefined;

  if (!team || !weight) {
    return { ok: false, reason: 'missing team/weight' };
  }

  const seq = (saveSeq.get(gameId) ?? 0) + 1;
  saveSeq.set(gameId, seq);

  // Mark in-flight without committing lockedPick yet.
  store.update((s) => ({
    ...s,
    [gameId]: { ...(s[gameId] ?? {}), saveState: 'saving', saveError: undefined }
  }));

  const result = await lockPickPost(gameId, team, weight);

  // A newer save (or a clear) superseded us — ignore this response entirely.
  if (saveSeq.get(gameId) !== seq) {
    return result.ok ? { ok: true } : { ok: false, reason: result.reason ?? 'Lock failed' };
  }

  if (!result.ok) {
    // Per-game restore so one failed save can't clobber other games' state.
    store.update((s) => ({
      ...s,
      [gameId]: { ...before, saveState: 'error', saveError: result.reason ?? 'Couldn’t save' }
    }));
    return { ok: false, reason: result.reason ?? 'Lock failed' };
  }

  store.update((s) => {
    const e = s[gameId] ?? {};
    return {
      ...s,
      [gameId]: {
        ...e,
        lockedPick: { team, weight },
        lockedAt: result.locked_at ?? e.lockedAt ?? new Date().toISOString(),
        saveState: undefined,
        saveError: undefined
      }
    };
  });

  return { ok: true };
}

/**
 * Remove a game's pick locally: cancels any pending save, invalidates any in-flight
 * save, and resets the entry. The caller is responsible for the server-side unlock
 * (the `unlock_pick` RPC) when a saved pick is being cleared.
 */
export function clearPick(gameId: string, store: PicksStore = picks) {
  cancelSave(gameId);
  // Bump the sequence so a save already awaiting the server is treated as stale.
  saveSeq.set(gameId, (saveSeq.get(gameId) ?? 0) + 1);
  store.update((s) => ({ ...s, [gameId]: {} }));
}

/**
 * Reset a game back to a staged team with no weight (so it returns to the board,
 * unsaved). Used when moving an All-In away from a previously-held game. Pass
 * `null` for `team` (pick'em / no-line games) to stage nothing.
 */
export function stageFavorite(gameId: string, team: TeamSide | null, store: PicksStore = picks) {
  cancelSave(gameId);
  saveSeq.set(gameId, (saveSeq.get(gameId) ?? 0) + 1);
  store.update((s) => ({ ...s, [gameId]: team ? { selected: { team } } : {} }));
}

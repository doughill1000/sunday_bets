// Picks-board state: a React port of the web app's src/lib/stores/picks.ts.
// The board the UI renders is DERIVED: the server's picks (react-query data)
// merged with a local overlay of staged selections, transient save status and
// optimistic lock/clear results. Deriving instead of effect-syncing keeps the
// hook compatible with the React Compiler hooks rules and means a refetch can
// never wipe an in-flight selection. Staged picks auto-save on a trailing
// debounce; a per-game sequence counter drops stale in-flight responses.
// Mount one board per (week, group) — key the consuming component accordingly.
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { favoriteSide } from '@/domain/spread';
import {
  allInIntent as resolveAllInIntent,
  type AllInHolder,
  type AllInIntent
} from '@/domain/rules';
import type {
  PickEntry,
  PickGame,
  PickSelection,
  SaveState,
  StagedSelection,
  TeamSide,
  WeightCode
} from '@/domain/types';
import { savePick, unlockPick } from './picks-api';

/** Trailing debounce window for auto-save. Coalesces rapid L→M→H toggles into one RPC. */
export const SAVE_DEBOUNCE_MS = 700;

/** Per-game local overlay on top of the server's picks. */
type LocalEntry = {
  selected?: StagedSelection;
  saveState?: SaveState;
  saveError?: string;
  /**
   * Local view of the saved pick until the next my-picks refetch confirms it:
   * a PickSelection right after a successful save, 'cleared' right after a
   * remove, undefined to trust the server.
   */
  lockedOverride?: PickSelection | 'cleared';
  lockedAtOverride?: string;
};

export type PicksBoard = {
  entries: Record<string, PickEntry>;
  selectTeam: (gameId: string, team: TeamSide) => void;
  setWeight: (gameId: string, weight: WeightCode) => void;
  /** Resolve what tapping All-In on this game should do given the whole board. */
  allInIntentFor: (gameId: string) => AllInIntent;
  /** Clear a saved (or staged) pick; server unlock first when one is locked. */
  removePick: (gameId: string) => Promise<{ ok: boolean; reason?: string }>;
  /** Move the week's All-In from its current holder onto `toGameId`. */
  moveAllIn: (from: AllInHolder, toGameId: string) => Promise<{ ok: boolean; reason?: string }>;
  /** Re-run a failed save now. */
  retrySave: (gameId: string) => void;
};

export function usePicksBoard(
  games: PickGame[],
  serverPicks: Record<string, PickEntry> | undefined,
  activeGroupId: string | null,
  opts: { isLastWeek: boolean; finalWeekUnlimitedAllin: boolean }
): PicksBoard {
  const [local, setLocal] = useState<Record<string, LocalEntry>>({});

  const entries = useMemo<Record<string, PickEntry>>(() => {
    const merged: Record<string, PickEntry> = {};
    const gameIds = new Set([...Object.keys(serverPicks ?? {}), ...Object.keys(local)]);
    for (const gameId of gameIds) {
      const server = serverPicks?.[gameId] ?? {};
      const overlay = local[gameId] ?? {};
      const cleared = overlay.lockedOverride === 'cleared';
      const lockedPick = cleared
        ? undefined
        : ((overlay.lockedOverride as PickSelection | undefined) ?? server.lockedPick);
      merged[gameId] = {
        lockedPick,
        lockedAt: cleared ? undefined : (overlay.lockedAtOverride ?? server.lockedAt),
        lockedSpreadValue: cleared ? undefined : server.lockedSpreadValue,
        lockedSpreadTeamId: cleared ? undefined : server.lockedSpreadTeamId,
        selected: overlay.selected,
        saveState: overlay.saveState,
        saveError: overlay.saveError
      };
    }
    return merged;
  }, [serverPicks, local]);

  // Latest-value refs for async callbacks (debounced saves, RPC continuations).
  // Written in an effect — never during render — per the react-hooks/refs rule;
  // handlers always run after the effect, so they observe current values.
  const entriesRef = useRef(entries);
  const localRef = useRef(local);
  useEffect(() => {
    entriesRef.current = entries;
    localRef.current = local;
  }, [entries, local]);

  const queryClient = useQueryClient();
  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const saveSeq = useRef(new Map<string, number>());

  // Clear pending debounce timers on unmount (week/group switch remounts the board).
  useEffect(() => {
    const timers = saveTimers.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  const invalidatePicks = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['my-picks'] });
  }, [queryClient]);

  const doSave = useCallback(
    async (gameId: string) => {
      const before = entriesRef.current[gameId];
      const team = before?.selected?.team ?? before?.lockedPick?.team;
      const weight = before?.selected?.weight ?? before?.lockedPick?.weight;
      if (!team || !weight) return;

      const seq = (saveSeq.current.get(gameId) ?? 0) + 1;
      saveSeq.current.set(gameId, seq);

      setLocal((s) => ({
        ...s,
        [gameId]: { ...s[gameId], saveState: 'saving', saveError: undefined }
      }));

      const result = await savePick(gameId, team, weight, activeGroupId);

      // A newer save (or a clear) superseded us — ignore this response entirely.
      if (saveSeq.current.get(gameId) !== seq) return;

      if (!result.ok) {
        // Keep the staged selection so Retry can re-submit it.
        setLocal((s) => ({
          ...s,
          [gameId]: { ...s[gameId], saveState: 'error', saveError: result.reason }
        }));
        return;
      }

      const skippedCount = result.skipped.length;
      const saveError =
        skippedCount > 0
          ? `Saved — couldn’t apply to ${skippedCount} group${skippedCount === 1 ? '' : 's'}`
          : undefined;

      // Spread keeps any selection staged mid-flight (its own debounced save is
      // still pending) — mirrors the web store's success update.
      setLocal((s) => ({
        ...s,
        [gameId]: {
          ...s[gameId],
          saveState: undefined,
          saveError,
          lockedOverride: { team, weight },
          lockedAtOverride: result.lockedAt ?? new Date().toISOString()
        }
      }));
      invalidatePicks();
    },
    [activeGroupId, invalidatePicks]
  );

  const scheduleSave = useCallback(
    (gameId: string) => {
      const existing = saveTimers.current.get(gameId);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        saveTimers.current.delete(gameId);
        void doSave(gameId);
      }, SAVE_DEBOUNCE_MS);
      saveTimers.current.set(gameId, timer);
    },
    [doSave]
  );

  const cancelSave = useCallback((gameId: string) => {
    const existing = saveTimers.current.get(gameId);
    if (existing) {
      clearTimeout(existing);
      saveTimers.current.delete(gameId);
    }
  }, []);

  const selectTeam = useCallback(
    (gameId: string, team: TeamSide) => {
      setLocal((s) => {
        const e = s[gameId] ?? {};
        return { ...s, [gameId]: { ...e, selected: { ...e.selected, team } } };
      });
      scheduleSave(gameId);
    },
    [scheduleSave]
  );

  const setWeight = useCallback(
    (gameId: string, weight: WeightCode) => {
      setLocal((s) => {
        const e = s[gameId] ?? {};
        return { ...s, [gameId]: { ...e, selected: { ...e.selected, weight } } };
      });
      scheduleSave(gameId);
    },
    [scheduleSave]
  );

  const allInIntentFor = useCallback(
    (gameId: string) =>
      resolveAllInIntent(
        gameId,
        games,
        entriesRef.current,
        opts.isLastWeek,
        opts.finalWeekUnlimitedAllin
      ),
    [games, opts.isLastWeek, opts.finalWeekUnlimitedAllin]
  );

  const removePick = useCallback(
    async (gameId: string) => {
      cancelSave(gameId);
      saveSeq.current.set(gameId, (saveSeq.current.get(gameId) ?? 0) + 1);

      const beforeLocal = localRef.current[gameId];
      const hadLock = !!entriesRef.current[gameId]?.lockedPick;

      // Optimistically clear: mask any server-side lock and drop staged state.
      setLocal((s) => ({ ...s, [gameId]: { lockedOverride: 'cleared' } }));

      if (hadLock) {
        const result = await unlockPick(gameId);
        if (!result.ok) {
          // Roll back to the pre-clear overlay (server lock resurfaces) + surface why.
          setLocal((s) => ({
            ...s,
            [gameId]: { ...beforeLocal, saveError: result.reason }
          }));
          return { ok: false, reason: result.reason };
        }
        invalidatePicks();
      }
      return { ok: true };
    },
    [cancelSave, invalidatePicks]
  );

  const moveAllIn = useCallback(
    async (from: AllInHolder, toGameId: string) => {
      // Clear the held game server-side if it was saved, then re-stage its favorite —
      // same sequence as the web WeightSelect moveAllIn().
      if (from.locked) {
        const result = await removePick(from.game.id);
        if (!result.ok) return result;
      } else {
        cancelSave(from.game.id);
        saveSeq.current.set(from.game.id, (saveSeq.current.get(from.game.id) ?? 0) + 1);
      }
      const restagedTeam = favoriteSide(from.game);
      setLocal((s) => {
        const held = s[from.game.id] ?? {};
        return {
          ...s,
          [from.game.id]: {
            ...held,
            selected: restagedTeam ? { team: restagedTeam } : undefined,
            saveState: undefined,
            saveError: undefined
          }
        };
      });
      setWeight(toGameId, 'A');
      return { ok: true };
    },
    [cancelSave, removePick, setWeight]
  );

  const retrySave = useCallback(
    (gameId: string) => {
      void doSave(gameId);
    },
    [doSave]
  );

  return { entries, selectTeam, setWeight, allInIntentFor, removePick, moveAllIn, retrySave };
}

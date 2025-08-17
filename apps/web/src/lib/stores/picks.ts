import { writable, get } from 'svelte/store';

export type TeamSide = 'away' | 'home';
export type Weight = 'L' | 'M' | 'H' | 'A';

export type PickState = { team: TeamSide; weight: Weight };
export type PickEntry = {
  // current working selection in the UI
  selected?: PickState;
  // frozen selection when locked
  lockedPick?: PickState;
  lockedAt?: string; // ISO
  unlocksUsed?: number; // 0 or 1
};

type PicksState = Record<string, PickEntry>; // key: gameId

const STORAGE_KEY = 'picks_v1';

function load(): PicksState {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export const picks = writable<PicksState>(load());

picks.subscribe((v) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)); } catch {}
});

// Helpers
export function getEntry(gameId: string): PickEntry {
  return get(picks)[gameId] ?? {};
}

export function selectTeam(gameId: string, team: TeamSide) {
  picks.update((s) => {
    const e = s[gameId] ?? {};
    const w = e.selected?.weight ?? e.lockedPick?.weight ?? 'L';
    s[gameId] = { ...e, selected: { team, weight: w } };
    return s;
  });
}

export function setWeight(gameId: string, weight: Weight) {
  picks.update((s) => {
    const e = s[gameId] ?? {};
    const t = e.selected?.team ?? e.lockedPick?.team ?? 'home';
    s[gameId] = { ...e, selected: { team: t, weight } };
    return s;
  });
}

export function hasAceElsewhere(gameId: string): boolean {
  const state = get(picks);
  return Object.entries(state).some(([id, e]) =>
    id !== gameId && (e.lockedPick?.weight === 'A')
  );
}

export function canUseAce(gameId: string): boolean {
  // Allow A if: no other locked A, OR the locked A is on this same game.
  const e = getEntry(gameId);
  if (e.lockedPick?.weight === 'A') return true;
  return !hasAceElsewhere(gameId);
}

export function isLocked(gameId: string): boolean {
  return !!getEntry(gameId).lockedPick;
}

export function lockPick(gameId: string): { ok: boolean; reason?: string } {
  const state = get(picks);
  const e = state[gameId] ?? {};
  const sel = e.selected;
  if (!sel) return { ok: false, reason: 'Select a team and weight first.' };

  if (sel.weight === 'A' && !canUseAce(gameId)) {
    return { ok: false, reason: 'Only one A weight allowed per week.' };
  }

  state[gameId] = {
    ...e,
    lockedPick: { ...sel },
    lockedAt: new Date().toISOString(),
    unlocksUsed: e.unlocksUsed ?? 0
  };
  picks.set(state);
  return { ok: true };
}

export function unlockPick(gameId: string): { ok: boolean; reason?: string } {
  const state = get(picks);
  const e = state[gameId];
  if (!e?.lockedPick) return { ok: false, reason: 'Not locked.' };
  if ((e.unlocksUsed ?? 0) >= 1) return { ok: false, reason: 'Unlock limit reached.' };

  state[gameId] = {
    ...e,
    lockedPick: undefined,
    lockedAt: undefined,
    unlocksUsed: (e.unlocksUsed ?? 0) + 1
  };
  picks.set(state);
  return { ok: true };
}

export function kickoffPassed(kickoffISO: string): boolean {
  const t = new Date(kickoffISO).getTime();
  return isFinite(t) && Date.now() >= t;
}

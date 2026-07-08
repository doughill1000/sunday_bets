// src/lib/stores/__tests__/picks.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  picks,
  setPicks,
  selectTeam,
  setWeight,
  lockPick,
  clearPick,
  stageFavorite
} from '$lib/stores/picks';
import { get } from 'svelte/store';
import * as api from '$lib/api/picks';

vi.mock('$lib/api/picks', () => ({
  lockPick: vi.fn()
}));

const mockApi = api as unknown as { lockPick: ReturnType<typeof vi.fn> };

beforeEach(() => {
  setPicks({});
  vi.clearAllMocks();
  mockApi.lockPick.mockResolvedValue({ ok: true });
});

describe('staged selection', () => {
  it('selectTeam sets only the team, preserving an existing weight', () => {
    setPicks({ g1: { selected: { team: 'home', weight: 'H' } } });
    selectTeam('g1', 'away');
    expect(get(picks).g1.selected).toEqual({ team: 'away', weight: 'H' });
  });

  it('setWeight sets only the weight, preserving an existing team', () => {
    setPicks({ g2: { selected: { team: 'home' } } });
    setWeight('g2', 'A');
    expect(get(picks).g2.selected).toEqual({ team: 'home', weight: 'A' });
  });

  it('selectTeam on a fresh game stages a half (team only, no weight)', () => {
    selectTeam('g3', 'home');
    expect(get(picks).g3.selected).toEqual({ team: 'home' });
    expect(get(picks).g3.selected?.weight).toBeUndefined();
  });

  it('staging never persists on its own (no auto-save)', async () => {
    setPicks({ g1: { selected: { team: 'home' } } });
    setWeight('g1', 'M');
    // A fully-staged pick still saves nothing until "Lock in" is tapped.
    expect(mockApi.lockPick).not.toHaveBeenCalled();
    expect(get(picks).g1.lockedPick).toBeUndefined();
  });
});

describe('lockPick save path', () => {
  it('returns an error when the selection is incomplete', async () => {
    setPicks({ g1: {} });
    const res = await lockPick('g1');
    expect(res).toEqual({ ok: false, reason: 'missing team/weight' });
    expect(mockApi.lockPick).not.toHaveBeenCalled();
  });

  it('commits lockedPick and clears saveState on success', async () => {
    setPicks({ g1: { selected: { team: 'home', weight: 'H' } } });
    mockApi.lockPick.mockResolvedValueOnce({ ok: true, locked_at: '2024-01-01T00:00:00Z' });
    const res = await lockPick('g1');
    expect(res).toEqual({ ok: true });
    const s = get(picks).g1;
    expect(s.lockedPick).toEqual({ team: 'home', weight: 'H' });
    expect(s.saveState).toBeUndefined();
    expect(s.saveError).toBeUndefined();
  });

  it('restores only the failed game and surfaces the reason (per-game rollback)', async () => {
    setPicks({
      g1: { selected: { team: 'away', weight: 'M' } },
      g2: { lockedPick: { team: 'home', weight: 'L' } }
    });
    const g2Before = JSON.parse(JSON.stringify(get(picks).g2));
    mockApi.lockPick.mockResolvedValueOnce({ ok: false, reason: 'already locked' });
    const res = await lockPick('g1');
    expect(res).toEqual({ ok: false, reason: 'already locked' });
    const g1 = get(picks).g1;
    // Staged selection preserved; no lockedPick written; error surfaced.
    expect(g1.selected).toEqual({ team: 'away', weight: 'M' });
    expect(g1.lockedPick).toBeUndefined();
    expect(g1.saveState).toBe('error');
    expect(g1.saveError).toBe('already locked');
    // Other game untouched.
    expect(get(picks).g2).toEqual(g2Before);
  });

  it('ignores a stale response when a newer save has started (last write wins)', async () => {
    const resolvers: Array<(v: { ok: boolean; locked_at?: string }) => void> = [];
    mockApi.lockPick.mockImplementation(() => new Promise((resolve) => resolvers.push(resolve)));
    setPicks({ g1: { selected: { team: 'home', weight: 'L' } } });

    const p1 = lockPick('g1'); // seq 1
    const p2 = lockPick('g1'); // seq 2 (supersedes seq 1)

    // Resolve the FIRST (now stale) request — must be ignored.
    resolvers[0]({ ok: true, locked_at: '2024-01-01T00:00:00Z' });
    await p1;
    expect(get(picks).g1.lockedPick).toBeUndefined();

    // Resolve the latest request — it wins.
    resolvers[1]({ ok: true, locked_at: '2024-02-02T00:00:00Z' });
    await p2;
    expect(get(picks).g1.lockedPick).toEqual({ team: 'home', weight: 'L' });
  });

  it('Retry re-saves after a failure', async () => {
    setPicks({ g1: { selected: { team: 'home', weight: 'H' } } });
    mockApi.lockPick.mockResolvedValueOnce({ ok: false, reason: 'boom' });
    await lockPick('g1');
    expect(get(picks).g1.saveState).toBe('error');

    mockApi.lockPick.mockResolvedValueOnce({ ok: true, locked_at: '2024-03-03T00:00:00Z' });
    const res = await lockPick('g1');
    expect(res.ok).toBe(true);
    expect(get(picks).g1.lockedPick).toEqual({ team: 'home', weight: 'H' });
    expect(get(picks).g1.saveState).toBeUndefined();
  });
});

describe('clearPick / stageFavorite', () => {
  it('clearPick resets the entry', () => {
    setPicks({ g1: { selected: { team: 'home', weight: 'L' } } });
    clearPick('g1');
    expect(get(picks).g1).toEqual({});
    expect(mockApi.lockPick).not.toHaveBeenCalled();
  });

  it('stageFavorite resets to a staged team with no weight', () => {
    setPicks({ g1: { lockedPick: { team: 'away', weight: 'A' } } });
    stageFavorite('g1', 'home');
    expect(get(picks).g1).toEqual({ selected: { team: 'home' } });
  });

  it('stageFavorite with a null team (pick’em / no line) stages nothing', () => {
    setPicks({ g1: { selected: { team: 'home', weight: 'A' } } });
    stageFavorite('g1', null);
    expect(get(picks).g1).toEqual({});
  });
});

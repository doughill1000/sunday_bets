// tests/stores/picks.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { picks, setPicks, selectTeam, setWeight, lockPick } from '$lib/stores/picks';
import { get } from 'svelte/store';
import * as api from '$lib/api/picks';

vi.mock('$lib/api/picks', () => ({
  lockPick: vi.fn()
}));

const mockLockPick = api as unknown as { lockPick: ReturnType<typeof vi.fn> };

beforeEach(() => {
  setPicks({});
  vi.clearAllMocks();
});

describe('picks store', () => {
  it('selectTeam sets selected team preserving existing weight', () => {
    setPicks({ g1: { selected: { team: 'home', weight: 'H' } } as any });
    selectTeam('g1', 'away');
    expect(get(picks).g1.selected).toEqual({ team: 'away', weight: 'H' });
  });

  it('setWeight sets weight preserving existing team', () => {
    setPicks({ g2: { selected: { team: 'home', weight: 'L' } } as any });
    setWeight('g2', 'A');
    expect(get(picks).g2.selected).toEqual({ team: 'home', weight: 'A' });
  });

  it('lockPick returns error when missing selection', async () => {
    setPicks({ g3: {} as any });
    const res = await lockPick('g3');
    expect(res).toEqual({ ok: false, reason: 'missing team/weight' });
  });

  it('lockPick optimistic success path updates then confirms', async () => {
    setPicks({ g4: { selected: { team: 'home', weight: 'H' } } as any });
    mockLockPick.lockPick.mockResolvedValueOnce({ ok: true, locked_at: '2024-01-01T00:00:00Z' });
    const res = await lockPick('g4');
    expect(res).toEqual({ ok: true });
    const state = get(picks).g4;
    expect(state.lockedPick).toEqual({ team: 'home', weight: 'H' });
    // Accept either millisecond-trimmed or .000Z variant when comparing same instant
    const iso = new Date(state.lockedAt!).toISOString();
    expect(iso.startsWith('2024-01-01T00:00:00')).toBe(true);
    expect(Date.parse(state.lockedAt!)).toBeGreaterThanOrEqual(Date.parse('2024-01-01T00:00:00Z'));
    expect(mockLockPick.lockPick).toHaveBeenCalledWith('g4', 'home', 'H');
  });

  it('lockPick rollback on failure restores previous state', async () => {
    setPicks({ g5: { selected: { team: 'away', weight: 'M' } } as any });
    const snapshot = JSON.parse(JSON.stringify(get(picks)));
    mockLockPick.lockPick.mockResolvedValueOnce({ ok: false, reason: 'already locked' });
    const res = await lockPick('g5');
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('already locked');
    expect(get(picks)).toEqual(snapshot); // rolled back
  });

  it('lockPick retains optimistic timestamp if server omits one', async () => {
    setPicks({ g6: { selected: { team: 'home', weight: 'L' } } as any });
    mockLockPick.lockPick.mockResolvedValueOnce({ ok: true });
    const res = await lockPick('g6');
    expect(res.ok).toBe(true);
    const state = get(picks).g6;
    expect(state.lockedPick).toEqual({ team: 'home', weight: 'L' });
    expect(state.lockedAt).toBeTruthy();
  });
});

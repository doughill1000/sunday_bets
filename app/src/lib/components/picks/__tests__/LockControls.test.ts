import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LockControls from '../LockControls.svelte';
import { setPicks, picks } from '../../../stores/picks';
import { get } from 'svelte/store';

// Mock the API module
vi.mock('$lib/api/picks', () => ({
  lockPick: vi.fn(async () => ({ ok: true })),
  unlockPick: vi.fn(async () => ({ ok: true })),
}));

describe('LockControls', () => {
  const game = { id: 'g1' } as any;

  beforeEach(() => {
    setPicks({
      g1: { selected: { team: 'home', weight: 'M' } } as any,
    });
    vi.clearAllMocks();
  });

  it('locks a pick (calls API and updates store)', async () => {
    const { lockPick } = await import('$lib/api/picks');
    render(LockControls, { props: { game, initialized: true, started: false, locked: false } });
    await fireEvent.click(screen.getByText('Lock Pick'));
    expect(lockPick).toHaveBeenCalledWith('g1', 'home', 'M');
    expect(get(picks).g1.lockedPick).toEqual({ team: 'home', weight: 'M' });
  });

  it('unlocks a pick (calls API and clears lockedPick)', async () => {
    const { unlockPick } = await import('$lib/api/picks');
    // Start as locked
    setPicks({ g1: { lockedPick: { team: 'home', weight: 'M' } } as any });
    render(LockControls, { props: { game, initialized: true, started: false, locked: true } });
    await fireEvent.click(screen.getByText('Unlock'));
    expect(unlockPick).toHaveBeenCalledWith('g1');
    expect(get(picks).g1.lockedPick).toBeUndefined();
  });

  it('disables lock when not initialized or started', async () => {
    const { lockPick } = await import('$lib/api/picks');
    const { rerender } = render(LockControls, { props: { game, initialized: false, started: false, locked: false } });
    expect(screen.getByText('Lock Pick')).toBeDisabled();

    await rerender({ game, initialized: true, started: true, locked: false });
    expect(screen.getByText('Lock Pick')).toBeDisabled();
    expect(lockPick).not.toHaveBeenCalled();
  });
});
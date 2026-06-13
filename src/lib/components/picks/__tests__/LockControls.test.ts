import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LockControls from '../LockControls.svelte';
import { setPicks, picks } from '../../../stores/picks';
import { get } from 'svelte/store';

// Mock the API module
vi.mock('$lib/api/picks', () => ({
  lockPick: vi.fn(async () => ({ ok: true })),
  unlockPick: vi.fn(async () => ({ ok: true }))
}));

vi.mock('$lib/domain/rules', () => ({
  canUseAllInRule: vi.fn(() => true)
}));

const game = { id: 'g1' } as any;

describe('LockControls', () => {
  beforeEach(() => {
    setPicks({});
    vi.clearAllMocks();
  });

  it('locks a pick (calls API and updates store)', async () => {
    setPicks({
      g1: { selected: { team: 'home', weight: 'M' } } as any
    });
    const { lockPick } = await import('$lib/api/picks');

    render(LockControls, {
      props: { game, initialized: true, started: false, locked: false }
    });

    const btn = screen.getByRole('button', { name: /Lock Pick/i });
    expect(btn).toBeEnabled();

    await fireEvent.click(btn);

    expect(lockPick).toHaveBeenCalledWith('g1', 'home', 'M');
    expect(get(picks).g1.lockedPick).toEqual({ team: 'home', weight: 'M' });
  });

  it('unlocks a pick (calls API and clears lockedPick) - fixed text match', async () => {
    setPicks({
      g1: { lockedPick: { team: 'home', weight: 'M' } } as any
    });
    const { unlockPick } = await import('$lib/api/picks');

    render(LockControls, {
      props: { game, initialized: true, started: false, locked: true }
    });

    // Match button with emoji prefix using accessible name
    const btn = screen.getByRole('button', { name: /Unlock/i });
    expect(btn).toBeEnabled();

    await fireEvent.click(btn);

    expect(unlockPick).toHaveBeenCalledWith('g1');
    expect(get(picks).g1.lockedPick).toBeUndefined();
  });

  it('does not unlock when started (button disabled)', async () => {
    setPicks({
      g1: { lockedPick: { team: 'home', weight: 'M' } } as any
    });
    const { unlockPick } = await import('$lib/api/picks');

    render(LockControls, {
      props: { game, initialized: true, started: true, locked: true }
    });

    const btn = screen.getByRole('button', { name: /Unlock/i });
    expect(btn).toBeDisabled();

    await fireEvent.click(btn);
    expect(unlockPick).not.toHaveBeenCalled();
    expect(get(picks).g1.lockedPick).toEqual({ team: 'home', weight: 'M' });
  });

  it('disables lock when not initialized', async () => {
    const { lockPick } = await import('$lib/api/picks');

    render(LockControls, {
      props: { game, initialized: false, started: false, locked: false }
    });

    const btn = screen.getByRole('button', { name: /Lock Pick/i });
    expect(btn).toBeDisabled();
    await fireEvent.click(btn);
    expect(lockPick).not.toHaveBeenCalled();
  });

  it('allows locking an All-In pick from the UI (lock_pick enforces the weekly rule server-side)', async () => {
    const { lockPick } = await import('$lib/api/picks');

    setPicks({
      g1: { selected: { team: 'home', weight: 'A' } } as any
    });

    render(LockControls, {
      props: { game, initialized: true, started: false, locked: false }
    });

    const btn = screen.getByRole('button', { name: /Lock Pick/i });
    expect(btn).toBeEnabled();

    await fireEvent.click(btn);
    expect(lockPick).toHaveBeenCalledWith('g1', 'home', 'A');
    expect(get(picks).g1.lockedPick).toEqual({ team: 'home', weight: 'A' });
  });
});

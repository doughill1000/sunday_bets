import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LockControls from '../LockControls.svelte';
import { setPicks, picks } from '../../../stores/picks';
import { get } from 'svelte/store';

vi.mock('$lib/api/picks', () => ({
  lockPick: vi.fn(async () => ({ ok: true, locked_at: '2024-01-01T00:00:00Z' })),
  unlockPick: vi.fn(async () => ({ ok: true }))
}));

const game = { id: 'g1' } as any;

describe('LockControls (save indicator + clear)', () => {
  beforeEach(() => {
    setPicks({});
    vi.clearAllMocks();
  });

  it('shows the Saving… indicator while a save is in flight', () => {
    setPicks({ g1: { selected: { team: 'home', weight: 'M' }, saveState: 'saving' } });
    render(LockControls, { props: { game, started: false } });
    expect(screen.getByText('Saving…')).toBeInTheDocument();
  });

  it('shows Couldn’t save — Retry on failure and re-saves on Retry', async () => {
    setPicks({
      g1: { selected: { team: 'home', weight: 'M' }, saveState: 'error', saveError: 'boom' }
    });
    const { lockPick } = await import('$lib/api/picks');

    render(LockControls, { props: { game, started: false } });
    expect(screen.getByText(/Couldn.t save/)).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(lockPick).toHaveBeenCalledWith('g1', 'home', 'M'));
    await waitFor(() => expect(get(picks).g1.lockedPick).toEqual({ team: 'home', weight: 'M' }));
    expect(get(picks).g1.saveState).toBeUndefined();
  });

  it('renders no indicator when idle', () => {
    setPicks({ g1: { selected: { team: 'home' } } });
    render(LockControls, { props: { game, started: false } });
    expect(screen.queryByText('Saving…')).not.toBeInTheDocument();
    expect(screen.queryByText(/Couldn.t save/)).not.toBeInTheDocument();
  });

  it('Clear pick removes a purely-staged pick without calling unlock', async () => {
    setPicks({ g1: { selected: { team: 'home', weight: 'M' } } });
    const { unlockPick } = await import('$lib/api/picks');

    render(LockControls, { props: { game, started: false } });
    await fireEvent.click(screen.getByRole('button', { name: 'Clear pick' }));

    expect(unlockPick).not.toHaveBeenCalled();
    expect(get(picks).g1).toEqual({});
  });

  it('Clear pick unlocks server-side then clears a saved pick', async () => {
    setPicks({ g1: { lockedPick: { team: 'home', weight: 'M' } } });
    const { unlockPick } = await import('$lib/api/picks');

    render(LockControls, { props: { game, started: false } });
    await fireEvent.click(screen.getByRole('button', { name: 'Clear pick' }));

    await waitFor(() => expect(unlockPick).toHaveBeenCalledWith('g1'));
    await waitFor(() => expect(get(picks).g1).toEqual({}));
  });

  it('hides Clear pick once the game has started', () => {
    setPicks({ g1: { selected: { team: 'home', weight: 'M' } } });
    render(LockControls, { props: { game, started: true } });
    expect(screen.queryByRole('button', { name: 'Clear pick' })).not.toBeInTheDocument();
  });
});

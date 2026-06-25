// src/lib/components/picks/__tests__/WeightSelect.test.ts
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WeightSelect from '$lib/components/picks/WeightSelect.svelte';
import { picks, setPicks } from '$lib/stores/picks';
import { get } from 'svelte/store';
import { WEIGHTS } from '$lib/types/domain';
import type { PickGame } from '$lib/types/games';

vi.mock('$lib/api/picks', () => ({
  lockPick: vi.fn(async () => ({ ok: true, locked_at: '2024-01-01T00:00:00Z' })),
  unlockPick: vi.fn(async () => ({ ok: true }))
}));

const FUTURE = new Date(Date.now() + 3600_000).toISOString();
const PAST = new Date(Date.now() - 3600_000).toISOString();

function game(id: string, over: Partial<PickGame> = {}): PickGame {
  return {
    id,
    kickoff: FUTURE,
    home: `${id.toUpperCase()}H`,
    away: `${id.toUpperCase()}A`,
    homeTeamId: 1,
    awayTeamId: 2,
    spreadTeamId: 1,
    spreadValue: -3,
    ...over
  };
}

const allInRadio = () =>
  screen.getByRole('radio', {
    name: (name) => name.toLowerCase().includes(WEIGHTS.A.label.toLowerCase())
  });

describe('WeightSelect', () => {
  beforeEach(() => {
    setPicks({});
    vi.clearAllMocks();
  });

  it('disables all weights when the pick cannot change', () => {
    render(WeightSelect, { props: { gameId: 'g1', games: [game('g1')], canChange: false } });
    expect(allInRadio()).toBeDisabled();
  });

  it('stages L/M/H immediately on click', async () => {
    render(WeightSelect, { props: { gameId: 'g1', games: [game('g1')], canChange: true } });
    const highBtn = screen.getByRole('radio', {
      name: (name) => name.toLowerCase().includes(WEIGHTS.H.label.toLowerCase())
    });
    await fireEvent.click(highBtn);
    expect(get(picks).g1.selected?.weight).toBe('H');
  });

  it('All-In opens an inline confirm and only saves after Confirm', async () => {
    setPicks({ g1: { selected: { team: 'home' } } });
    render(WeightSelect, { props: { gameId: 'g1', games: [game('g1')], canChange: true } });

    await fireEvent.click(allInRadio());
    // Confirm step is shown; weight not committed yet.
    expect(screen.getByRole('button', { name: 'Confirm All-In' })).toBeInTheDocument();
    expect(get(picks).g1.selected?.weight).toBeUndefined();

    await fireEvent.click(screen.getByRole('button', { name: 'Confirm All-In' }));
    expect(get(picks).g1.selected?.weight).toBe('A');
  });

  it('cancelling the All-In confirm leaves the weight unchanged', async () => {
    setPicks({ g1: { selected: { team: 'home', weight: 'M' } } });
    render(WeightSelect, {
      props: { gameId: 'g1', games: [game('g1')], canChange: true, selectedWeight: 'M' }
    });

    await fireEvent.click(allInRadio());
    await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(get(picks).g1.selected?.weight).toBe('M');
  });

  it('All-In prompts a move when another pre-kickoff game holds it', async () => {
    const games = [game('g1'), game('g2')];
    setPicks({ g2: { lockedPick: { team: 'away', weight: 'A' } } });
    const { unlockPick } = await import('$lib/api/picks');

    render(WeightSelect, { props: { gameId: 'g1', games, canChange: true } });

    await fireEvent.click(allInRadio());
    expect(screen.getByText(/Move All-In from/)).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Move All-In' }));

    // Held game is unlocked server-side then re-staged to its favorite (no weight);
    // this game becomes the All-In.
    await waitFor(() => expect(unlockPick).toHaveBeenCalledWith('g2'));
    await waitFor(() => expect(get(picks).g1.selected?.weight).toBe('A'));
    expect(get(picks).g2.selected).toEqual({ team: 'home' }); // favorite of g2
    expect(get(picks).g2.lockedPick).toBeUndefined();
  });

  it('disables All-In when the holder has already kicked off', () => {
    const games = [game('g1'), game('g2', { kickoff: PAST })];
    setPicks({ g2: { lockedPick: { team: 'away', weight: 'A' } } });
    render(WeightSelect, { props: { gameId: 'g1', games, canChange: true } });
    expect(allInRadio()).toBeDisabled();
  });
});

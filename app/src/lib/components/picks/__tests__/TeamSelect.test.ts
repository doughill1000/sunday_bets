// src/lib/components/picks/__tests__/TeamSelect.test.ts
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, beforeEach } from 'vitest';
import TeamSelect from '$lib/components/picks/TeamSelect.svelte';
import { picks, setPicks } from '$lib/stores/picks';
import { get } from 'svelte/store';

const game = { id: 'g1', home: 'CIN', away: 'JAX' } as any;

describe('TeamSelect', () => {
  beforeEach(() => setPicks({}));

  it('shows away and home buttons', () => {
    render(TeamSelect, { props: { game, canChange: true } });
    expect(screen.getByRole('button', { name: 'JAX' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CIN' })).toBeInTheDocument();
  });

  it('clicking selects the team', async () => {
    render(TeamSelect, { props: { game, canChange: true } });
    await fireEvent.click(screen.getByRole('button', { name: 'JAX' }));
    expect(get(picks).g1.selected?.team).toBe('away');
  });

  it('disables buttons when cannot change', () => {
    render(TeamSelect, { props: { game, canChange: false } });
    expect(screen.getByRole('button', { name: 'JAX' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'CIN' })).toBeDisabled();
  });
});

// src/lib/components/picks/__tests__/WeightSelect.test.ts
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, beforeEach } from 'vitest';
import WeightSelect from '$lib/components/picks/WeightSelect.svelte';
import { picks, setPicks } from '$lib/stores/picks';
import { get } from 'svelte/store';
import { WEIGHTS } from '$lib/types/domain';

describe('WeightSelect', () => {
  beforeEach(() => setPicks({}));

  it('disables all weights when the pick cannot change', () => {
    render(WeightSelect, {
      props: { gameId: 'g1', canChange: false, selectedWeight: 'L' }
    });

    const allInLabel = WEIGHTS.A.label;
    const allInBtn = screen.getByRole('radio', {
      name: (name) => name.toLowerCase().includes(allInLabel.toLowerCase())
    });

    expect(allInBtn).toBeDisabled();
  });

  it('changes weight on click', async () => {
    render(WeightSelect, {
      props: { gameId: 'g1', canChange: true, selectedWeight: 'L' }
    });

    // Click the "High" (or whatever your label is) button
    const highLabel = WEIGHTS.H.label; // e.g., "High" or "H"
    const highBtn = screen.getByRole('radio', {
      name: (name) => name.toLowerCase().includes(highLabel.toLowerCase())
    });

    await fireEvent.click(highBtn);
    expect(get(picks).g1.selected?.weight).toBe('H');
  });
});

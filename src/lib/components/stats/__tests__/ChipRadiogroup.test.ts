import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import ChipRadiogroup from '../ChipRadiogroup.svelte';

const options = [
  { value: 'team', label: 'Team' },
  { value: 'weight', label: 'Weight' },
  { value: 'trend', label: 'Trend' },
  { value: 'h2h', label: 'H2H' }
];

describe('ChipRadiogroup', () => {
  it('exposes radio semantics and selects a clicked chip', async () => {
    const onchange = vi.fn();
    render(ChipRadiogroup, {
      props: {
        options,
        value: 'team',
        ariaLabel: 'Season breakdown',
        idPrefix: 'breakdown',
        onchange
      }
    });

    expect(screen.getByRole('radiogroup', { name: 'Season breakdown' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Team' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Weight' })).toHaveAttribute('tabindex', '-1');

    await fireEvent.click(screen.getByRole('radio', { name: 'Weight' }));
    expect(onchange).toHaveBeenCalledWith('weight');
  });

  it.each([
    ['ArrowRight', 'weight'],
    ['ArrowDown', 'weight'],
    ['ArrowLeft', 'h2h'],
    ['ArrowUp', 'h2h'],
    ['Home', 'team'],
    ['End', 'h2h']
  ])('moves selection and focus with %s', async (key, expectedValue) => {
    const onchange = vi.fn();
    render(ChipRadiogroup, {
      props: {
        options,
        value: 'team',
        ariaLabel: 'Season breakdown',
        idPrefix: 'breakdown',
        onchange
      }
    });

    await fireEvent.keyDown(screen.getByRole('radio', { name: 'Team' }), { key });

    expect(onchange).toHaveBeenCalledWith(expectedValue);
    const expectedLabel = options.find((option) => option.value === expectedValue)?.label;
    expect(screen.getByRole('radio', { name: expectedLabel })).toHaveFocus();
  });
});

import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import GameplaySettingsCard from '../GameplaySettingsCard.svelte';

vi.mock('$lib/api/admin/settings', () => ({
  updateFinalWeekAllin: vi.fn().mockResolvedValue({ ok: true })
}));

describe('GameplaySettingsCard', () => {
  it('renders its own success note beside its own toggle', async () => {
    const { container } = render(GameplaySettingsCard, {
      props: { finalWeekUnlimitedAllin: false }
    });

    await fireEvent.click(screen.getByRole('button', { name: /off/i }));

    const note = await waitFor(() => screen.getByRole('status'));
    expect(note).toHaveTextContent('Final-week All-In exception enabled.');
    expect(container.contains(note)).toBe(true);
  });
});

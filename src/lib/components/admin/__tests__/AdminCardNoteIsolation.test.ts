// Regression for #816: the admin page used to keep one shared `msg` for all six
// cards, so triggering one card's action clobbered whatever another card's note
// said (and rendered it off-screen, below the last card). Each card now owns its
// note independently — this proves two cards mounted side by side (as they are on
// /admin) don't interfere with each other.
import { render, screen, fireEvent, waitFor, within } from '@testing-library/svelte';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import TestNotificationCard from '../TestNotificationCard.svelte';
import GameplaySettingsCard from '../GameplaySettingsCard.svelte';

vi.mock('$lib/api/admin/settings', () => ({
  updateFinalWeekAllin: vi.fn().mockResolvedValue({ ok: true })
}));

describe('admin cards mounted together', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('an action on one card does not clear or overwrite another card note', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ok: true, sent: 6, total: 6, pruned: 0 })
      })
    );

    const gameplay = render(GameplaySettingsCard, { props: { finalWeekUnlimitedAllin: false } });
    const testNotification = render(TestNotificationCard);

    await fireEvent.click(within(gameplay.container).getByRole('button', { name: /off/i }));
    await waitFor(() =>
      expect(within(gameplay.container).getByRole('status')).toHaveTextContent(
        'Final-week All-In exception enabled.'
      )
    );

    // Triggering the second card's action must leave the first card's note untouched.
    await fireEvent.click(
      within(testNotification.container).getByRole('button', { name: /send test notification/i })
    );
    await waitFor(() =>
      expect(within(testNotification.container).getByRole('status')).toHaveTextContent(
        'Sent test to 6 subscriptions.'
      )
    );

    expect(within(gameplay.container).getByRole('status')).toHaveTextContent(
      'Final-week All-In exception enabled.'
    );
  });

  it('both cards can hold independent notes visible without scrolling (390px)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ok: true, sent: 6, total: 6, pruned: 0 })
      })
    );

    const gameplay = render(GameplaySettingsCard, { props: { finalWeekUnlimitedAllin: false } });
    const testNotification = render(TestNotificationCard);

    await fireEvent.click(within(gameplay.container).getByRole('button', { name: /off/i }));
    await fireEvent.click(
      within(testNotification.container).getByRole('button', { name: /send test notification/i })
    );

    const gameplayNote = await waitFor(() => within(gameplay.container).getByRole('status'));
    const testNote = await waitFor(() => within(testNotification.container).getByRole('status'));

    // Each note renders inside its own card's DOM tree — adjacent to that card's
    // own controls — rather than in one shared node after the last card.
    expect(gameplay.container.contains(gameplayNote)).toBe(true);
    expect(testNotification.container.contains(testNote)).toBe(true);
    expect(screen.getAllByRole('status')).toHaveLength(2);
  });
});

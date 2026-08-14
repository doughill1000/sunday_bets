// #816: the admin note used to render once, page-level, below all six cards —
// off-screen on mobile. Each card now owns and renders its own result inline.
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import TestNotificationCard from '../TestNotificationCard.svelte';

function mockFetchOnce(body: unknown, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      json: () => Promise.resolve(body)
    })
  );
}

describe('TestNotificationCard', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders its result next to its own button, not a separate shared surface', async () => {
    mockFetchOnce({ ok: true, sent: 6, total: 6, pruned: 0 });
    const { container } = render(TestNotificationCard);

    await fireEvent.click(screen.getByRole('button', { name: /send test notification/i }));

    const note = await waitFor(() => screen.getByRole('status'));
    expect(note).toHaveTextContent('Sent test to 6 subscriptions.');
    // The note lives inside this card's own DOM, adjacent to its button.
    expect(container.contains(note)).toBe(true);
  });

  it('surfaces a failed send as an assertive alert within the card', async () => {
    mockFetchOnce({ ok: false, reason: 'boom' }, false);
    const { container } = render(TestNotificationCard);

    await fireEvent.click(screen.getByRole('button', { name: /send test notification/i }));

    const note = await waitFor(() => screen.getByRole('alert'));
    expect(note).toHaveTextContent('boom');
    expect(container.contains(note)).toBe(true);
  });
});

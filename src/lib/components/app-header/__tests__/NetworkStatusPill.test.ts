import { render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { QueryClient, onlineManager } from '@tanstack/svelte-query';
import Harness from './NetworkStatusPillHarness.svelte';

// The shell offline/stale pill (audit S5, ADR-0017). Two independent signals drive it:
// browser offline (via `onlineManager`) and an active query that errored while keeping its
// last-good data. `onlineManager` is a process-global singleton, so every test restores it.
afterEach(() => {
  onlineManager.setOnline(true);
});

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

describe('NetworkStatusPill', () => {
  it('is hidden when online with no errored queries', () => {
    render(Harness, { props: { client: makeClient() } });
    expect(screen.queryByTestId('network-status-pill')).not.toBeInTheDocument();
  });

  it('shows an offline message (no retry) when the browser goes offline', async () => {
    render(Harness, { props: { client: makeClient() } });

    onlineManager.setOnline(false);

    const pill = await screen.findByTestId('network-status-pill');
    expect(pill).toHaveTextContent(/offline/i);
    // Retrying is futile while offline — queries auto-resume on reconnect — so no button.
    expect(screen.queryByTestId('network-status-retry')).not.toBeInTheDocument();
  });

  it('surfaces a stale pill with a retry when an active query errors but keeps its data', async () => {
    render(Harness, { props: { client: makeClient(), withFailingQuery: true } });

    // The failing query starts with `initialData`, then its background refetch rejects: the
    // query is in error state but still holds data, which is exactly the case the pill flags.
    const pill = await screen.findByTestId('network-status-pill');
    expect(pill).toHaveTextContent(/couldn't refresh/i);
    expect(screen.getByTestId('network-status-retry')).toBeInTheDocument();
  });

  it('clears when the browser comes back online', async () => {
    render(Harness, { props: { client: makeClient() } });

    onlineManager.setOnline(false);
    await screen.findByTestId('network-status-pill');

    onlineManager.setOnline(true);
    await waitFor(() =>
      expect(screen.queryByTestId('network-status-pill')).not.toBeInTheDocument()
    );
  });
});

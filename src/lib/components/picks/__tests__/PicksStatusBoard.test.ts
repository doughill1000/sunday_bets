// src/lib/components/picks/__tests__/PicksStatusBoard.test.ts
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import PicksStatusBoard from '$lib/components/picks/PicksStatusBoard.svelte';
import type { PickStatusBoardEntry } from '$lib/types/picks';

const ME = 'me-doug';

function entry(
  userId: string,
  displayName: string,
  picksMade: number,
  gamesAvailable: number,
  avatarKey: string | null = null
): PickStatusBoardEntry {
  return {
    userId,
    displayName,
    avatarKey,
    picksMade,
    gamesAvailable,
    isComplete: gamesAvailable > 0 && picksMade >= gamesAvailable
  };
}

// Doug (you) 2/3, Hank 0/3, Beth 3/3 done, Charlie 1/3.
function makeBoard(): PickStatusBoardEntry[] {
  return [
    entry(ME, 'Doug', 2, 3, 'football'),
    entry('hank', 'Hank', 0, 3),
    entry('beth', 'Beth', 3, 3),
    entry('charlie', 'Charlie', 1, 3, 'shark')
  ];
}

describe('PicksStatusBoard', () => {
  it('renders nothing for a solo group (only you on the board)', () => {
    const { container } = render(PicksStatusBoard, {
      props: { board: [entry(ME, 'Doug', 2, 3)], myUserId: ME }
    });
    expect(container.querySelector('[data-testid="picks-status-board"]')).toBeNull();
  });

  it('renders a row per member with their N/M count', () => {
    render(PicksStatusBoard, { props: { board: makeBoard(), myUserId: ME } });
    const counts = screen.getAllByTestId('status-count').map((el) => el.textContent?.trim());
    // Every member's count is shown (order asserted separately).
    expect(counts).toContain('2/3');
    expect(counts).toContain('0/3');
    expect(counts).toContain('3/3');
    expect(counts).toContain('1/3');
  });

  it('shows the done summary as complete-over-total', () => {
    render(PicksStatusBoard, { props: { board: makeBoard(), myUserId: ME } });
    // Only Beth is complete (3/3) out of 4 members.
    expect(screen.getByTestId('status-summary').textContent?.trim()).toBe('1/4 done');
  });

  it('orders incomplete members before complete ones (surface the laggards)', () => {
    render(PicksStatusBoard, { props: { board: makeBoard(), myUserId: ME } });
    const names = screen.getAllByTestId('status-row').map((li) => li.getAttribute('data-user-id'));
    // Incomplete first, you pinned to the top of that bucket, then alphabetical;
    // complete (Beth) sinks to the bottom.
    expect(names).toEqual([ME, 'charlie', 'hank', 'beth']);
  });

  it('marks the current user with "(you)" and bold styling', () => {
    render(PicksStatusBoard, { props: { board: makeBoard(), myUserId: ME } });
    const meLabel = screen.getByText('Doug (you)');
    expect(meLabel.className).toContain('font-semibold');
  });

  it('flags complete vs pending members distinctly', () => {
    render(PicksStatusBoard, { props: { board: makeBoard(), myUserId: ME } });
    // Beth (3/3) is the only done member.
    expect(screen.getAllByTestId('status-done')).toHaveLength(1);
    expect(screen.getAllByTestId('status-pending')).toHaveLength(3);
  });

  it('never renders any pick content (no sides, teams, or weights)', () => {
    const { container } = render(PicksStatusBoard, { props: { board: makeBoard(), myUserId: ME } });
    // The board is counts-only by construction; guard against a future regression
    // that tries to surface pick detail here.
    expect(container.textContent).not.toMatch(/All-In|weight|spread/i);
  });
});

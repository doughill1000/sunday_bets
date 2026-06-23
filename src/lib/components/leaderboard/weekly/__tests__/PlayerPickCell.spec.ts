import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import type { LeaderboardPickCell } from '$lib/types/leaderboard';
import PlayerPickCell from '../PlayerPickCell.svelte';

describe('PlayerPickCell', () => {
  it('uses a neutral border for pushes', () => {
    const cell: LeaderboardPickCell = {
      weight: null,
      team: 'NYJ',
      result: 'P',
      spread: '+3'
    };

    const { container } = render(PlayerPickCell, { cell });
    const pickCell = container.firstElementChild;

    expect(pickCell?.className).toContain('border-muted-foreground');
    expect(pickCell?.className).not.toContain('border-warning');
  });
});

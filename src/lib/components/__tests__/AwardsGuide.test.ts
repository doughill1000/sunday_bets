import { render, fireEvent, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import AwardsGuide from '../AwardsGuide.svelte';
import { BADGE_GLOSSARY } from '$lib/domain/badges';
import { WEEKLY_AWARD_FLAVORS, WEEKLY_AWARD_ORDER } from '$lib/domain/weeklyAwards';

/**
 * The legend is the one place the weekly-award descriptions live now that the tiles' hover-only
 * `title=` is gone (#771). These guard the two things that would silently rot it: an award added
 * to `WEEKLY_AWARD_ORDER` that never reaches the legend, and the tier separation collapsing back
 * into one merged list (ADR-0035 — a shelf chip must not read as a season badge).
 *
 * `tests/setup.ts` stubs `matchMedia` with `matches: false`, so `MediaQuery('(min-width: 640px)')`
 * reports mobile and the guide opens as the bottom Sheet — the 390px form the issue is about.
 */
async function openGuide() {
  render(AwardsGuide);
  await fireEvent.click(screen.getByRole('button', { name: /awards legend/i }));
  return screen.getByTestId('awards-guide');
}

describe('AwardsGuide — weekly hardware', () => {
  it('lists every weekly award with the description from WEEKLY_AWARD_FLAVORS', async () => {
    const guide = await openGuide();
    const weekly = guide.querySelector('[data-testid="awards-guide-weekly"]');
    expect(weekly, 'the guide has no weekly-hardware region').not.toBeNull();

    for (const id of WEEKLY_AWARD_ORDER) {
      const { label, description } = WEEKLY_AWARD_FLAVORS[id];
      expect(weekly?.textContent, `weekly legend is missing "${label}"`).toContain(label);
      expect(weekly?.textContent, `weekly legend does not carry the "${id}" description`).toContain(
        description
      );
    }
  });

  it('lists the weekly awards in WEEKLY_AWARD_ORDER', async () => {
    const guide = await openGuide();
    const weekly = guide.querySelector('[data-testid="awards-guide-weekly"]');
    const text = weekly?.textContent ?? '';

    const positions = WEEKLY_AWARD_ORDER.map((id) => ({
      id,
      // The pair renders as its own row above the solo three, so ordering is asserted
      // within each grouping — which is where WEEKLY_AWARD_ORDER is observable.
      at: text.indexOf(WEEKLY_AWARD_FLAVORS[id].label)
    }));
    expect(positions.every((p) => p.at >= 0)).toBe(true);

    const pair = ['bad-beat', 'backdoor'] as const;
    const solo = WEEKLY_AWARD_ORDER.filter((id) => !pair.includes(id as (typeof pair)[number]));
    for (const group of [[...pair], solo]) {
      const inGroup = group.map((id) => text.indexOf(WEEKLY_AWARD_FLAVORS[id].label));
      expect(
        [...inGroup].sort((a, b) => a - b),
        `${group.join(',')} are out of order`
      ).toEqual(inGroup);
    }
  });

  it('renders Bad Beat and Backdoor as one paired row that names the unawarded field', async () => {
    const guide = await openGuide();
    const pair = guide.querySelector('[data-testid="awards-guide-weekly-pair"]');
    expect(pair, 'the paired cover-margin row is missing').not.toBeNull();

    const text = pair?.textContent ?? '';
    expect(text).toContain(WEEKLY_AWARD_FLAVORS['bad-beat'].label);
    expect(text).toContain(WEEKLY_AWARD_FLAVORS.backdoor.label);
    // The wide middle is the point: without it, "barely covered" reads as a rule most picks meet.
    expect(text).toMatch(/takes neither/i);

    // The other three explain themselves alone and must not be dragged into the pair.
    for (const id of ['game-ball', 'donkey-of-week', 'contrarian-win'] as const) {
      expect(text, `${id} should not sit inside the paired row`).not.toContain(
        WEEKLY_AWARD_FLAVORS[id].label
      );
    }
  });

  it('keeps the season titles in their own region, apart from the weekly tier', async () => {
    const guide = await openGuide();
    const season = guide.querySelector('[data-testid="awards-guide-season"]');
    const weekly = guide.querySelector('[data-testid="awards-guide-weekly"]');
    expect(season).not.toBeNull();
    expect(weekly).not.toBeNull();
    // Two regions, neither inside the other — a merged list would fail this.
    expect(season?.contains(weekly ?? null)).toBe(false);
    expect(weekly?.contains(season ?? null)).toBe(false);

    // The season badges still render as they always did, in their own region only.
    for (const badge of BADGE_GLOSSARY) {
      expect(season?.textContent, `season region is missing "${badge.label}"`).toContain(
        badge.label
      );
      expect(weekly?.textContent, `"${badge.label}" leaked into the weekly region`).not.toContain(
        badge.label
      );
    }
    // The season axes' zero labels survive the restructure.
    expect(guide.querySelector('[data-testid="awards-guide-axes"]')).not.toBeNull();
    expect(season?.textContent).toMatch(/no award/);
  });
});

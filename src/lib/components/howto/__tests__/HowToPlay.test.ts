import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import HowToPlay from '../HowToPlay.svelte';
import { tierLabel, type RatingTier } from '$lib/domain/rating';

const RATING_TIERS: RatingTier[] = ['square', 'solid', 'sharp', 'hotshot'];

function renderedCopy(): string {
  const { container } = render(HowToPlay);
  return container.textContent ?? '';
}

/** Guards against the copy rot #633 found: the onboarding copy must keep naming the
 *  load-bearing concepts it teaches, sourced from their real domain catalogs where one
 *  exists, so a renamed/removed concept fails this test instead of going unnoticed. */
describe('HowToPlay copy', () => {
  for (const tier of RATING_TIERS) {
    const label = tierLabel(tier);
    it(`mentions the "${label}" credibility tier`, () => {
      expect(renderedCopy(), `HowToPlay copy is missing the "${label}" credibility tier`).toMatch(
        new RegExp(label)
      );
    });
  }

  it('mentions the All-In', () => {
    expect(renderedCopy(), 'HowToPlay copy is missing "All-In"').toMatch(/All-In/);
  });

  it('mentions the sweat board', () => {
    expect(renderedCopy(), 'HowToPlay copy is missing "sweat board"').toMatch(/sweat board/i);
  });

  it('mentions Weekly Hardware', () => {
    expect(renderedCopy(), 'HowToPlay copy is missing "Weekly Hardware"').toMatch(
      /Weekly Hardware/
    );
  });

  it('calls the group a "League", never a "Group"', () => {
    expect(
      renderedCopy(),
      'HowToPlay copy says "Group" where the product vocabulary is "League"'
    ).not.toMatch(/\bGroup\b/);
  });
});

import { describe, it, expect } from 'vitest';
import { selectSeasonStoryFlash, type SeasonStoryFlashCandidate } from '../seasonStoryFlash';

const pending: SeasonStoryFlashCandidate = { hasContent: true, alreadySeen: false };
const seen: SeasonStoryFlashCandidate = { hasContent: true, alreadySeen: true };
const empty: SeasonStoryFlashCandidate = { hasContent: false, alreadySeen: false };

describe('selectSeasonStoryFlash', () => {
  it('shows nothing when neither flash has content', () => {
    expect(selectSeasonStoryFlash({ wrapped: empty, recap: empty })).toBeNull();
  });

  it('shows the only pending flash when just one is pending', () => {
    expect(selectSeasonStoryFlash({ wrapped: empty, recap: pending })).toBe('recap');
    expect(selectSeasonStoryFlash({ wrapped: pending, recap: empty })).toBe('wrapped');
  });

  it('ranks Wrapped above the weekly recap when both are pending', () => {
    // The whole point of #742: two flashes used to open on the same first paint.
    expect(selectSeasonStoryFlash({ wrapped: pending, recap: pending })).toBe('wrapped');
  });

  it('lets the recap through on a later open, once Wrapped has been seen', () => {
    // The suppressed flash is never marked seen, so the next open is its turn.
    expect(selectSeasonStoryFlash({ wrapped: seen, recap: pending })).toBe('recap');
  });

  it('never re-shows a flash the player already dismissed', () => {
    expect(selectSeasonStoryFlash({ wrapped: seen, recap: seen })).toBeNull();
    expect(selectSeasonStoryFlash({ wrapped: seen, recap: empty })).toBeNull();
  });

  it('treats a route-suppressed flash as not pending and yields to the next in line', () => {
    // Wrapped is suppressed on /wrapped, which renders the same story inline.
    expect(
      selectSeasonStoryFlash({
        wrapped: { ...pending, suppressed: true },
        recap: pending
      })
    ).toBe('recap');
  });

  it('shows nothing when the only pending flash is route-suppressed', () => {
    expect(
      selectSeasonStoryFlash({
        wrapped: { ...pending, suppressed: true },
        recap: seen
      })
    ).toBeNull();
  });
});

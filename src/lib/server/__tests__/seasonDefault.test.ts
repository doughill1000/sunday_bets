import { describe, it, expect } from 'vitest';
import { resolveSeasonYear } from '$lib/server/seasonDefault';

describe('resolveSeasonYear', () => {
  it('defaults to the latest season that has standings, not the active season year', () => {
    // Schedule Sync seeded 2026 (active year) but no games are graded yet, so the
    // group only has standings through 2024. Stay on 2024 to avoid blank rows.
    expect(resolveSeasonYear(null, [2024, 2023, 2022], 2026)).toBe(2024);
  });

  it('is order-independent when picking the latest available season', () => {
    expect(resolveSeasonYear(null, [2022, 2024, 2023], 2026)).toBe(2024);
  });

  it('switches to the new season once it has standings', () => {
    // Once 2026 produces graded results it appears in availableSeasons and wins.
    expect(resolveSeasonYear(null, [2026, 2024, 2023], 2026)).toBe(2026);
  });

  it('falls back to the active season year for a group with no standings at all', () => {
    expect(resolveSeasonYear(null, [], 2026)).toBe(2026);
  });

  it('honors an explicit, parseable ?season= param so users can browse history', () => {
    expect(resolveSeasonYear('2022', [2024, 2023, 2022], 2026)).toBe(2022);
  });

  it('ignores an unparseable ?season= param and uses the default', () => {
    expect(resolveSeasonYear('not-a-year', [2024, 2023], 2026)).toBe(2024);
  });
});

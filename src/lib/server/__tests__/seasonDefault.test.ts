import { describe, it, expect } from 'vitest';
import { resolveSeasonYear, resolveLiveSeasonYear } from '$lib/server/seasonDefault';

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

// #824: /week opened on last January all preseason. `availableSeasons` comes from the
// leaderboard matview, which filters `where w.is_scoring` (ADR-0016 boundary 1), so a
// preseason round contributes nothing and its season never enters the list — leaving the
// "what just happened" tab pointed at a season that ended in January while the round people
// were actually playing sat one hand-edited URL away.
describe('resolveLiveSeasonYear', () => {
  it('opens on a started NON-SCORING round, which never reaches availableSeasons', () => {
    // The reproduction: 2026 preseason week -2 is in progress and partly graded, but its
    // settlements are excluded from every aggregation, so the group has standings only
    // through 2025.
    expect(resolveLiveSeasonYear(null, 2026, [2025, 2024, 2023, 2022], 2026)).toBe(2026);
  });

  it('opens on a started scoring season before it has produced any standings', () => {
    // Week 1 has kicked off but nothing is graded yet — the same gap, one week later.
    expect(resolveLiveSeasonYear(null, 2026, [2025, 2024], 2026)).toBe(2026);
  });

  it('stays on the season in play once it does have standings', () => {
    expect(resolveLiveSeasonYear(null, 2026, [2026, 2025], 2026)).toBe(2026);
  });

  it('falls back to the last graded season when no week has started', () => {
    // The empty-summer guard, preserved: Schedule Sync has seeded 2026's weeks but none has
    // started, so the tab keeps showing the season that just finished rather than blank rows.
    expect(resolveLiveSeasonYear(null, null, [2025, 2024], 2026)).toBe(2025);
  });

  it('falls back to the active season year when there is nothing at all to show', () => {
    expect(resolveLiveSeasonYear(null, null, [], 2026)).toBe(2026);
  });

  it('honors an explicit ?season= over the season in play, so shared links land where they name', () => {
    // The #776 URL contract: `/league?view=weekly&season=2022` redirects into `/week?season=2022`.
    expect(resolveLiveSeasonYear('2022', 2026, [2025, 2024, 2022], 2026)).toBe(2022);
  });

  it('honors an explicit ?season= that names the last graded season during the preseason', () => {
    // Browsing back one season from the live preseason round must stick.
    expect(resolveLiveSeasonYear('2025', 2026, [2025, 2024], 2026)).toBe(2025);
  });

  it('ignores an unparseable ?season= param and uses the season in play', () => {
    expect(resolveLiveSeasonYear('not-a-year', 2026, [2025, 2024], 2026)).toBe(2026);
  });
});

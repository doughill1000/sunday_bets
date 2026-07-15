// CI drift-guard for the public demo season (#460, ADR-0026, acceptance criterion 5; extended
// #669 for the IA-mirror surfaces and the badge-catalog subset check).
//
// Renders every demo surface component against the COMMITTED snapshot fixture and fails if it
// throws or references a field the snapshot doesn't carry. This is the enforcement that forces
// a `pnpm demo:snapshot` regenerate whenever a demo-rendered component grows a new data
// dependency the frozen fixture doesn't yet satisfy — the shape-drift half of ADR-0026's
// staleness prevention (the AGENTS.md refresh rule covers coverage drift).
import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
import { getDemoSnapshot } from '../snapshot';
import { liveCoverState, type CoverVerdict } from '$lib/domain/liveCover';
import { BADGE_GLOSSARY } from '$lib/domain/badges';
import DemoPicksPageHarness from './DemoPicksPageHarness.svelte';
import DemoStatsPage from '../../../../routes/demo/stats/+page.svelte';
import DemoMarketPage from '../../../../routes/demo/market/+page.svelte';
import StandingsTable from '$lib/components/leaderboard/StandingsTable.svelte';
import RatingLadder from '$lib/components/leaderboard/RatingLadder.svelte';
import WeeklyHardware from '$lib/components/recap/WeeklyHardware.svelte';
import SeasonShelf from '$lib/components/recap/SeasonShelf.svelte';
import WeeklyLiveBoard from '$lib/components/leaderboard/WeeklyLiveBoard.svelte';
import DemoBanner from '$lib/components/demo/DemoBanner.svelte';
import LeagueHonors from '$lib/components/group/LeagueHonors.svelte';
import WrappedStory from '$lib/components/wrapped/WrappedStory.svelte';
import RecapCard from '$lib/components/recap/RecapCard.svelte';

const snapshot = getDemoSnapshot();

describe('demo snapshot fixture', () => {
  it('is a real generated snapshot, not the placeholder', () => {
    expect(snapshot.meta.completedSeasonYear).toBeGreaterThan(2000);
    expect(snapshot.meta.liveWeekNumber).toBeGreaterThan(0);
    expect(snapshot.persona.userId).toBeTruthy();
    expect(snapshot.persona.displayName).toBeTruthy();
  });

  it('carries the two temporal vantage points (frozen live week + completed season)', () => {
    expect(snapshot.liveWeek.games.length).toBeGreaterThan(0);
    expect(snapshot.leaderboard.totals.length).toBeGreaterThan(0);
    // The completed season powers the payoff surfaces.
    expect(snapshot.allTime.totals.length).toBeGreaterThan(0);
    expect(snapshot.honors.honors.trophyCase.length).toBeGreaterThan(0);
    expect(snapshot.recaps.length).toBeGreaterThan(0);
    expect(snapshot.wrapped.player).not.toBeNull();
    expect(snapshot.wrapped.league).not.toBeNull();
  });

  it('designates the persona as a real standings row (the "you" lens)', () => {
    const personaRow = snapshot.leaderboard.totals.find(
      (t) => t.user_id === snapshot.persona.userId
    );
    expect(personaRow, 'persona must appear in the featured season standings').toBeTruthy();
  });

  it('never presents Wrapped prose as the "AI unavailable" fallback', () => {
    // The demo always shows finished commentary; provenance lives in meta.aiProse.
    expect(snapshot.wrapped.player?.is_fallback).toBe(false);
    expect(snapshot.wrapped.league?.is_fallback).toBe(false);
  });

  it('never presents weekly recap prose as the "AI unavailable" fallback', () => {
    // Same as Wrapped: curated artifact, never the deterministic-fallback note.
    for (const recap of snapshot.recaps) expect(recap.is_fallback).toBe(false);
  });

  // #669: the fixture's badges must still exist in the live catalog — the check that would have
  // caught the 17-vs-15 staleness (#647) the day the catalog shrank.
  it('carries only badges that still exist in the live catalog', () => {
    const catalogIds = new Set(BADGE_GLOSSARY.map((g) => g.id));
    const stale = snapshot.honors.badges.map((b) => b.id).filter((id) => !catalogIds.has(id));
    expect(
      stale,
      `stale badge id(s) not in the live catalog — run \`pnpm demo:snapshot\`: ${stale.join(', ')}`
    ).toEqual([]);
  });
});

// #585: the frozen live week must demonstrate every live sweat state without a real game window.
describe('frozen live-week sweat states (#585)', () => {
  const games = snapshot.liveWeek.games;

  /** The persona's live cover verdict on a game, via the same mirror the picks board uses. */
  function personaVerdict(g: (typeof games)[number]): CoverVerdict | null {
    if (!g.personaPick || !g.liveScore) return null;
    const pickedTeamId = g.personaPick.side === 'home' ? g.homeTeamId : g.awayTeamId;
    return (
      liveCoverState({
        homeScore: g.liveScore.homeScore,
        awayScore: g.liveScore.awayScore,
        homeTeamId: g.homeTeamId,
        awayTeamId: g.awayTeamId,
        pickedTeamId,
        lockedSpreadTeamId: g.spreadTeamId,
        lockedSpreadValue: g.spreadValue
      })?.verdict ?? null
    );
  }

  it('carries in-progress games with live scores and a Final — unofficial game', () => {
    expect(games.some((g) => g.status === 'in_progress' && g.liveScore != null)).toBe(true);
    expect(
      games.some((g) => g.status === 'final_unofficial' && g.liveScore?.status === 'final')
    ).toBe(true);
  });

  it("demonstrates covering, not covering, and push on the persona's own cards", () => {
    const verdicts = new Set(games.map(personaVerdict).filter((v): v is CoverVerdict => v != null));
    expect(verdicts.has('covering')).toBe(true);
    expect(verdicts.has('not_covering')).toBe(true);
    expect(verdicts.has('push')).toBe(true);
  });

  it('reveals group picks for the per-member cover dots', () => {
    expect(games.some((g) => g.groupPicks.length > 0)).toBe(true);
  });

  it('carries provisional live standings with the persona flagged as "you"', () => {
    expect(snapshot.liveWeek.standings.length).toBeGreaterThan(0);
    const me = snapshot.liveWeek.standings.find((s) => s.userId === snapshot.persona.userId);
    expect(me?.isYou).toBe(true);
  });
});

describe('demo surfaces render against the fixture', () => {
  it('picks screen — the real PicksBoard in readonly mode (#669)', () => {
    // `/demo/+page.svelte` itself reshapes `snapshot.liveWeek` into the readonly PicksBoard's
    // props (seeded `lockedPick`s, frozen live scores, committed-vs-open split) — rendering the
    // page directly exercises that reshape, not a hand-duplicated copy of it.
    const { getByText, getByTestId, getAllByTestId, queryByTestId } = render(DemoPicksPageHarness, {
      props: {
        client: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
        data: {
          liveWeek: snapshot.liveWeek,
          personaName: snapshot.persona.displayName,
          personaUserId: snapshot.persona.userId
        } as unknown as import('../../../../routes/demo/$types').PageData
      }
    });
    expect(getByText('My Picks')).toBeInTheDocument();
    // The frozen live week always carries committed (live/final) games.
    expect(getByTestId('committed-section')).toBeInTheDocument();
    expect(getAllByTestId('committed-row').length).toBeGreaterThan(0);
    // No unlock/lock-in write controls in readonly mode.
    expect(queryByTestId('unlock-pick')).not.toBeInTheDocument();
  });

  it('weekly provisional live board (#584 surface)', () => {
    const { getByTestId } = render(WeeklyLiveBoard, {
      props: { standings: snapshot.liveWeek.standings, live: true, stale: false }
    });
    expect(getByTestId('weekly-live-board')).toBeInTheDocument();
  });

  it('season standings (shared StandingsTable, #669)', () => {
    const { getByTestId } = render(StandingsTable, {
      props: {
        rows: snapshot.leaderboard.totals,
        title: `${snapshot.meta.completedSeasonYear} standings`,
        currentUserId: snapshot.persona.userId,
        tableTestid: 'demo-standings-table',
        champion: snapshot.leaderboard.championUserId,
        showDropFootnote: snapshot.leaderboard.dropActive
      }
    });
    expect(getByTestId('demo-standings-table')).toBeInTheDocument();
  });

  it('all-time standings (same shared table, career rows)', () => {
    const { getByTestId } = render(StandingsTable, {
      props: {
        rows: snapshot.allTime.totals,
        title: 'All-time standings',
        currentUserId: snapshot.persona.userId,
        tableTestid: 'demo-alltime-table',
        showDropFootnote: snapshot.allTime.dropActive
      }
    });
    expect(getByTestId('demo-alltime-table')).toBeInTheDocument();
  });

  it('the credibility ladder under All-time (#637, #669)', () => {
    const { getByTestId } = render(RatingLadder, {
      props: { rows: snapshot.allTime.ladder, currentUserId: snapshot.persona.userId }
    });
    expect(getByTestId('rating-ladder')).toBeInTheDocument();
  });

  it('league honors + awards', () => {
    const { getByTestId } = render(LeagueHonors, {
      props: {
        honors: snapshot.honors.honors,
        badges: snapshot.honors.badges,
        members: snapshot.honors.members,
        currentUserId: snapshot.persona.userId,
        selectedSeason: snapshot.meta.completedSeasonYear,
        wrappedHref: '/demo/wrapped',
        recapsHref: '/demo/recap'
      }
    });
    expect(getByTestId('league-honors')).toBeInTheDocument();
  });

  it('weekly hardware on the Week tab / recap (#387, #669)', () => {
    const hardware = snapshot.weeklyAwards.weeks[0];
    expect(hardware, 'the fixture must carry at least one graded week of hardware').toBeTruthy();
    const { getByTestId } = render(WeeklyHardware, {
      props: { hardware, currentUserId: snapshot.persona.userId }
    });
    expect(getByTestId('weekly-hardware')).toBeInTheDocument();
  });

  it('the season shelf on the recap archive (#669)', () => {
    expect(snapshot.weeklyAwards.shelf.length).toBeGreaterThan(0);
    const { getByTestId } = render(SeasonShelf, {
      props: { shelf: snapshot.weeklyAwards.shelf, currentUserId: snapshot.persona.userId }
    });
    expect(getByTestId('season-shelf')).toBeInTheDocument();
  });

  it('demo Stats (#669) — real Stats surfaces off the frozen `stats` payload', () => {
    const { getByText } = render(DemoStatsPage, {
      props: {
        data: {
          persona: snapshot.persona,
          seasonYear: snapshot.meta.completedSeasonYear,
          stats: snapshot.stats
        } as unknown as import('../../../../routes/demo/stats/$types').PageData
      }
    });
    expect(getByText('Stats & history')).toBeInTheDocument();
  });

  it('demo Market (#669) — real Market surfaces off the frozen `market` payload', () => {
    const { getByTestId } = render(DemoMarketPage, {
      props: {
        data: {
          seasonYear: snapshot.meta.liveSeasonYear,
          market: snapshot.market
        } as unknown as import('../../../../routes/demo/market/$types').PageData
      }
    });
    expect(getByTestId('market-heading')).toBeInTheDocument();
  });

  it('season wrapped — player and league', () => {
    const player = render(WrappedStory, { props: { row: snapshot.wrapped.player! } });
    expect(player.getByTestId('wrapped-story')).toBeInTheDocument();
    player.unmount();
    const league = render(WrappedStory, { props: { row: snapshot.wrapped.league! } });
    expect(league.getByTestId('wrapped-story')).toBeInTheDocument();
  });

  it('weekly AI recaps', () => {
    for (const recap of snapshot.recaps) {
      const { getByText, unmount } = render(RecapCard, { props: { recap } });
      expect(getByText(`Week ${recap.week_number} Recap`)).toBeInTheDocument();
      unmount();
    }
  });

  it('persona banner', () => {
    const { getByTestId } = render(DemoBanner, {
      props: { personaName: snapshot.persona.displayName }
    });
    expect(getByTestId('demo-persona-banner')).toBeInTheDocument();
  });
});

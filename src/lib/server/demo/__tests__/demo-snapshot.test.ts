// CI drift-guard for the public demo season (#460, ADR-0026, acceptance criterion 5; extended
// #669 for the IA-mirror surfaces and the badge-catalog subset check).
//
// Renders every demo surface component against the COMMITTED snapshot fixture and fails if it
// throws or references a field the snapshot doesn't carry. This is the enforcement that forces
// a `pnpm demo:snapshot` regenerate whenever a demo-rendered component grows a new data
// dependency the frozen fixture doesn't yet satisfy — the shape-drift half of ADR-0026's
// staleness prevention (the AGENTS.md refresh rule covers coverage drift).
import { render } from '@testing-library/svelte';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { getDemoSnapshot } from '../snapshot';
import { load as loadDemoWeek } from '../../../../routes/demo/week/+page.server';
import { liveCoverState, type CoverVerdict } from '$lib/domain/liveCover';
import { MIN_QUALIFIED_DECISIONS, RATING_PAR, ratingTier } from '$lib/domain/rating';
import { BADGE_GLOSSARY } from '$lib/domain/badges';
import { WEEKLY_AWARD_ORDER } from '$lib/domain/weeklyAwards';
import DemoPicksPage from '../../../../routes/demo/+page.svelte';
import DemoWeekPage from '../../../../routes/demo/week/+page.svelte';
import DemoStatsPage from '../../../../routes/demo/stats/+page.svelte';
import DemoMarketPage from '../../../../routes/demo/market/+page.svelte';
import StandingsTable from '$lib/components/leaderboard/StandingsTable.svelte';
import RatingLadder from '$lib/components/leaderboard/RatingLadder.svelte';
import WeeklyHardware from '$lib/components/recap/WeeklyHardware.svelte';
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

  // #694: shape/coverage checks alone let a stale-but-well-formed snapshot stay green
  // (the #607-class blind spot ADR-0026 §6 / #669 flag) — these two assert editorial
  // freshness against the real calendar, not just against the fixture's own fields.
  it('has not fallen more than 2 seasons behind the live season (#694)', () => {
    // Matches the app's own season-year convention (ScheduleSyncCard.svelte): the NFL
    // season year is simply the calendar year, no month-based rollover.
    const liveSeasonYear = new Date().getFullYear();
    expect(
      snapshot.meta.completedSeasonYear,
      `demo's completed season (${snapshot.meta.completedSeasonYear}) is more than 2 years behind ` +
        `the live season (${liveSeasonYear}) — run \`pnpm demo:snapshot\` to curate a fresher one`
    ).toBeGreaterThanOrEqual(liveSeasonYear - 2);
  });

  it('was generated within the last 180 days (#694)', () => {
    const generatedAt = new Date(snapshot.meta.generatedAt);
    const ageDays = (Date.now() - generatedAt.getTime()) / (1000 * 60 * 60 * 24);
    expect(
      ageDays,
      `demo snapshot was generated ${Math.floor(ageDays)} days ago (> 180) — run ` +
        '`pnpm demo:snapshot` to regenerate it'
    ).toBeLessThanOrEqual(180);
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
    // props (seeded `lockedPick`s, started-vs-open split) — rendering the page directly
    // exercises that reshape, not a hand-duplicated copy of it.
    const { getByText, getByTestId, queryByTestId } = render(DemoPicksPage, {
      props: {
        data: {
          liveWeek: snapshot.liveWeek,
          personaName: snapshot.persona.displayName,
          personaUserId: snapshot.persona.userId
        } as unknown as import('../../../../routes/demo/$types').PageData
      }
    });
    expect(getByText('My Picks')).toBeInTheDocument();
    expect(getByTestId('week-underway-strip')).toBeInTheDocument();
    expect(getByTestId('see-the-week')).toHaveAttribute('href', '/demo/week');
    expect(getByTestId('game-card')).toBeInTheDocument();
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

  it('freezes only the post-#866 award catalog', () => {
    // A snapshot generated before #866 still *renders* — the tiles just loop over whatever ids
    // it froze — so the shape checks alone would let a stale fixture stay green while /demo/week
    // showed a Donkey the live app no longer mints. The catalog is what has to be asserted.
    const ids = new Set(snapshot.weeklyAwards.weeks.flatMap((w) => w.awards.map((a) => a.id)));
    expect(ids.size, 'the fixture minted no hardware at all').toBeGreaterThan(0);
    for (const id of ids) {
      expect(
        WEEKLY_AWARD_ORDER as string[],
        `retired award "${id}" is still in the fixture`
      ).toContain(id);
    }
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

// #833: the demo mirrors the shipped IA — the picking board on `/demo`, the sweat on
// `/demo/week`. These are the assertions that fail if `/demo` regrows a post-kickoff row, if the
// live board or the per-game cards vanish from `/demo/week`, or if either page acquires a live
// feed (ADR-0026 §4).
describe('demo follows the /picks–/week IA split (#833)', () => {
  const demoPicksData = {
    liveWeek: snapshot.liveWeek,
    personaName: snapshot.persona.displayName,
    personaUserId: snapshot.persona.userId
  } as unknown as import('../../../../routes/demo/$types').PageData;

  // The real loader, not a hand-built stand-in — so a loader that stops deriving the breakdown
  // fails here rather than passing against a fixture the page never actually receives.
  const demoWeekData = loadDemoWeek(
    {} as never
  ) as unknown as import('../../../../routes/demo/week/$types').PageData;

  afterEach(() => vi.restoreAllMocks());

  it('leaves no post-kickoff game row on the /demo board', () => {
    const { queryAllByTestId } = render(DemoPicksPage, { props: { data: demoPicksData } });
    const openIds = snapshot.liveWeek.games.filter((g) => g.status === 'open').map((g) => g.id);
    const rendered = queryAllByTestId('game-card').map((el) => el.getAttribute('data-game-id'));
    expect(
      rendered.toSorted(),
      'only games that have NOT kicked off may render as cards on /demo (#832 boundary)'
    ).toEqual(openIds.toSorted());
    // Nor may the board smuggle the live layer back in via a score readout.
    expect(queryAllByTestId('live-score')).toHaveLength(0);
    expect(queryAllByTestId('final-unofficial')).toHaveLength(0);
  });

  it('/demo/week shows the ranked live board and a card per game', () => {
    const { getByTestId, queryAllByTestId } = render(DemoWeekPage, {
      props: { data: demoWeekData }
    });
    expect(getByTestId('demo-weekly-breakdown')).toBeInTheDocument();
    expect(getByTestId('weekly-live-board')).toBeInTheDocument();
    expect(queryAllByTestId('live-board-row')).toHaveLength(snapshot.liveWeek.standings.length);
    // The hardware payoff still sits below the sweat.
    expect(getByTestId('demo-week-hardware')).toBeInTheDocument();
  });

  it('/demo/week lights the live cover dots off the frozen scores', () => {
    const { queryAllByTestId } = render(DemoWeekPage, { props: { data: demoWeekData } });
    expect(queryAllByTestId('member-cover-dot').length).toBeGreaterThan(0);
    expect(queryAllByTestId('live-score').length).toBeGreaterThan(0);
    // The `final_unofficial` game is the one state the demo exists to show that /demo cannot.
    expect(queryAllByTestId('final-unofficial').length).toBeGreaterThan(0);
  });

  it('/demo/week leads with the games in play (#831 ordering)', () => {
    const inProgress = demoWeekData.breakdown.filter(
      (g) => demoWeekData.liveScores[g.gameId]?.status === 'in_progress'
    );
    expect(inProgress.length, 'the frozen week must still have games in play').toBeGreaterThan(0);
    expect(
      demoWeekData.breakdown.slice(0, inProgress.length).map((g) => g.gameId),
      'every in-progress game must sort above every final and not-yet-started one'
    ).toEqual(inProgress.map((g) => g.gameId));
  });

  it('neither demo screen issues a per-visitor live-feed call (ADR-0026 §4)', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(DemoPicksPage, { props: { data: demoPicksData } }).unmount();
    render(DemoWeekPage, { props: { data: demoWeekData } }).unmount();
    expect(
      fetchSpy.mock.calls.map((c) => String(c[0])),
      'the frozen demo must never reach for /api/live-scores'
    ).toEqual([]);
  });
});

// #844: the demo is the shop window, so its numbers have to be the ones a real season produces.
// These are EDITORIAL guards on the regenerated fixture, not domain rules — they fail if the
// seeded league's cover rates drift back up and the ladder regrows the 1547-1720 spread it used
// to show, which oversold the product to exactly the visitors it was built to convince.
describe('demo credibility ratings read as a real season (#844, ADR-0032)', () => {
  // Half the credibility meter's window (METER_HALF_WINDOW = 50). The honest v2 spread is only
  // ~±35 points — conviction-flat shrinkage pulls hard toward par — so a demo rating outside
  // par ± 25 is a seeding artifact, not a bettor.
  const BAND = 25;
  const rated = snapshot.allTime.ladder.filter((r) => r.entry.rating != null);

  it('populates the ladder — every rated member past the qualification gate', () => {
    expect(rated.length, 'the demo ladder must not be a card of Unrated rows').toBeGreaterThan(0);
    for (const r of rated) {
      expect(r.entry.decisions, `${r.display_name} is rated below the gate`).toBeGreaterThanOrEqual(
        MIN_QUALIFIED_DECISIONS
      );
    }
  });

  it('keeps every rating inside the honest v2 band', () => {
    for (const r of rated) {
      expect(
        r.entry.rating,
        `${r.display_name} reads ${r.entry.rating} — outside ${RATING_PAR - BAND}-${RATING_PAR + BAND}. ` +
          'Recalibrate ARCHETYPES/SEASON_FORM in supabase/scripts/seed-demo, then regenerate.'
      ).toBeGreaterThanOrEqual(RATING_PAR - BAND);
      expect(r.entry.rating).toBeLessThanOrEqual(RATING_PAR + BAND);
    }
  });

  it('shows a believable tier mix — mostly Solid/Sharp, at most one Hotshot', () => {
    const tiers = rated.map((r) => ratingTier(r.entry.rating!));
    expect(tiers.filter((t) => t === 'hotshot')).toHaveLength(1);
    expect(
      tiers.filter((t) => t === 'solid' || t === 'sharp').length,
      `tier mix ${tiers.join('/')} — the middle of the ladder must be its majority`
    ).toBeGreaterThan(rated.length / 2);
  });

  it('backs those ratings with realistic career cover rates', () => {
    for (const t of snapshot.allTime.totals) {
      const settled = t.wins + t.losses + t.pushes;
      const cover = (t.wins + 0.5 * t.pushes) / settled;
      expect(
        cover,
        `${t.display_name} covered ${(cover * 100).toFixed(1)}% of ${settled} career decisions`
      ).toBeGreaterThanOrEqual(0.46);
      expect(cover).toBeLessThanOrEqual(0.55);
    }
  });

  it('feeds the /stats Career hero the same in-band numbers', () => {
    const ladderById = new Map(snapshot.allTime.ladder.map((r) => [r.user_id, r.entry.rating]));
    for (const e of snapshot.stats.playerRatings) {
      expect(e.rating, `${e.user_id} disagrees between the Career hero and the ladder`).toBe(
        ladderById.get(e.user_id)
      );
    }
  });
});

// #844: the All-In reveal is the one signature moment ADR-0023 fires BEFORE kickoff, which is
// what keeps it on the picking board after #832 moved everything under way to /demo/week.
describe('the demo board shows the All-In reveal (#844, ADR-0023)', () => {
  const demoPicksData = {
    liveWeek: snapshot.liveWeek,
    personaName: snapshot.persona.displayName,
    personaUserId: snapshot.persona.userId
  } as unknown as import('../../../../routes/demo/$types').PageData;

  it('carries exactly one seeded, locked, pre-kickoff All-In', () => {
    const [declaration, ...rest] = snapshot.liveWeek.allIns;
    expect(declaration, 'the frozen week must seed an All-In to reveal').toBeTruthy();
    expect(rest, 'one declaration is a showcase; several are clutter').toHaveLength(0);
    expect(declaration.weight).toBe('A');
    expect(declaration.pickedTeamShort).toBeTruthy();
    expect(
      declaration.userId,
      'a persona All-In would move the only open game into the locked section and leave /demo ' +
        'a picking board with nothing to pick'
    ).not.toBe(snapshot.persona.userId);
    expect(
      snapshot.liveWeek.games.find((g) => g.id === declaration.gameId)?.status,
      'the example must ride a game that has NOT kicked off, so it survives the /demo–/demo/week split'
    ).toBe('open');
  });

  it('renders the "This week\'s All-Ins" banner on /demo', () => {
    const { getByTestId, queryAllByTestId } = render(DemoPicksPage, {
      props: { data: demoPicksData }
    });
    expect(getByTestId('all-in-declarations')).toBeInTheDocument();
    expect(queryAllByTestId('all-in-entry')).toHaveLength(snapshot.liveWeek.allIns.length);
  });
});

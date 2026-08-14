import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import WeeklyPickCard from '../WeeklyPickCard.svelte';
import type { LiveScoreEntry } from '$lib/live/types';
import type { WeeklyGameBreakdown, WeeklyPickRow } from '$lib/types/leaderboard';

// #838 — the card header's result column. `gameCover` itself is covered in
// domain/__tests__/spread.test.ts; what only the component can answer is which score the
// header ends up asserting (settled vs feed vs nothing), and how it words the verdict.

const HOME_ID = 1;
const AWAY_ID = 2;

const pick = (overrides: Partial<WeeklyPickRow> = {}): WeeklyPickRow => ({
  userId: 'u1',
  displayName: 'Doug',
  avatarKey: null,
  isYou: true,
  pickedSide: 'home',
  pickedTeamShort: 'CIN',
  weight: 'M',
  outcome: null,
  notParticipating: false,
  pointsDelta: null,
  pickedTeamId: HOME_ID,
  lockedSpreadValue: 3.5,
  lockedSpreadTeamId: HOME_ID,
  ...overrides
});

// CIN home, JAX away, CIN favoured by 3.5.
const game = (overrides: Partial<WeeklyGameBreakdown> = {}): WeeklyGameBreakdown => ({
  gameId: 'g1',
  away: 'JAX',
  home: 'CIN',
  homeScore: null,
  awayScore: null,
  kickoff: '2025-09-14T17:00:00Z',
  isFinal: false,
  homeTeamId: HOME_ID,
  awayTeamId: AWAY_ID,
  spreadTeamId: HOME_ID,
  spreadValue: 3.5,
  picks: [pick()],
  ...overrides
});

const live = (overrides: Partial<LiveScoreEntry> = {}): LiveScoreEntry =>
  ({
    homeScore: 27,
    awayScore: 20,
    status: 'in_progress',
    period: 3,
    displayClock: '4:12',
    ...overrides
  }) as LiveScoreEntry;

describe('WeeklyPickCard header (#838)', () => {
  it('a settled final leads with the score and says who covered, past tense', () => {
    render(WeeklyPickCard, {
      props: {
        game: game({
          isFinal: true,
          homeScore: 27,
          awayScore: 20,
          picks: [pick({ outcome: 'win', pointsDelta: 3 })]
        })
      }
    });

    expect(screen.getByTestId('final-score')).toHaveTextContent('20 – 27');
    expect(screen.getByTestId('game-cover')).toHaveTextContent('CIN covered by 3.5');
    expect(screen.queryByTestId('live-score')).toBeNull();
  });

  it('names the underdog when the favourite fails to cover', () => {
    // CIN -3.5 wins by 3 — the dog covered by half a point.
    render(WeeklyPickCard, {
      props: {
        game: game({
          isFinal: true,
          homeScore: 24,
          awayScore: 21,
          picks: [pick({ outcome: 'loss', pointsDelta: -3 })]
        })
      }
    });

    expect(screen.getByTestId('game-cover')).toHaveTextContent('JAX covered by 0.5');
  });

  it('a game in progress reads from the feed, present tense', () => {
    render(WeeklyPickCard, { props: { game: game(), liveScore: live() } });

    expect(screen.getByTestId('live-score')).toHaveTextContent('20 – 27');
    expect(screen.getByTestId('game-cover')).toHaveTextContent('CIN covering by 3.5');
  });

  it('an unofficial final is already decided, so it drops the present tense', () => {
    render(WeeklyPickCard, {
      props: { game: game(), liveScore: live({ status: 'final', period: null }) }
    });

    expect(screen.getByTestId('final-unofficial')).toBeInTheDocument();
    expect(screen.getByTestId('game-cover')).toHaveTextContent('CIN covered by 3.5');
  });

  it('a stale feed stops asserting a score at all rather than freezing one', () => {
    render(WeeklyPickCard, { props: { game: game(), liveScore: live(), liveStale: true } });

    expect(screen.queryByTestId('live-score')).toBeNull();
    expect(screen.queryByTestId('final-score')).toBeNull();
    expect(screen.queryByTestId('game-cover')).toBeNull();
  });

  it('graded settlement outranks the feed: the settled final owns the number', () => {
    // The grade cron has run, so the live overlay yields even though a feed entry exists.
    render(WeeklyPickCard, {
      props: {
        game: game({
          isFinal: true,
          homeScore: 27,
          awayScore: 20,
          picks: [pick({ outcome: 'win', pointsDelta: 3 })]
        }),
        liveScore: live({ homeScore: 99, awayScore: 0 })
      }
    });

    expect(screen.getByTestId('final-score')).toHaveTextContent('20 – 27');
    expect(screen.queryByTestId('live-score')).toBeNull();
  });

  it('landing on the number reads as a push', () => {
    render(WeeklyPickCard, {
      props: {
        game: game({
          spreadValue: 7,
          isFinal: true,
          homeScore: 31,
          awayScore: 24,
          picks: [pick({ outcome: 'push', pointsDelta: 0 })]
        })
      }
    });

    expect(screen.getByTestId('game-cover')).toHaveTextContent('Push');
  });

  // An unlined game was never pickable (#802/#803) — there is no number to have beaten, so the
  // card shows the score and stops, rather than a placeholder that reads as an error.
  it('an unlined game keeps its score but shows no line and no cover', () => {
    render(WeeklyPickCard, {
      props: {
        game: game({
          spreadValue: null,
          spreadTeamId: null,
          isFinal: true,
          homeScore: 27,
          awayScore: 20
        })
      }
    });

    expect(screen.getByTestId('final-score')).toHaveTextContent('20 – 27');
    expect(screen.queryByTestId('game-line')).toBeNull();
    expect(screen.queryByTestId('game-cover')).toBeNull();
  });

  it('before kickoff there is no result column at all', () => {
    render(WeeklyPickCard, { props: { game: game({ picks: [pick({ pickedSide: null })] }) } });

    expect(screen.queryByTestId('final-score')).toBeNull();
    expect(screen.queryByTestId('game-cover')).toBeNull();
    expect(screen.getByTestId('game-line')).toHaveTextContent('CIN -3.5');
    expect(screen.getByText('Picks reveal at kickoff.')).toBeInTheDocument();
  });
});

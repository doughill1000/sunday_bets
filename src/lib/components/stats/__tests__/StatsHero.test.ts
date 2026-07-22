// The hero's two renderings of ONE number (#361, #738): the career rating leads the Career hero
// as the full band, and rides the season hero as the compact chip. These cover the conflation
// boundary that made the chip a mandatory part of #738 — it must read as career/market on a card
// whose every other figure is season-scoped — and the honest-silence gate (ADR-0032 §5).
import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import StatsHero from '../StatsHero.svelte';
import type { PlayerRatingEntry } from '$lib/domain/rating';

const RATED: PlayerRatingEntry = {
  user_id: 'u1',
  rating: 1512,
  decisions: 240,
  decisionsToQualify: 0,
  seasonDelta: 4
};

const UNRATED: PlayerRatingEntry = {
  user_id: 'u2',
  rating: null,
  decisions: 7,
  decisionsToQualify: 13,
  seasonDelta: null
};

const BASE = {
  isYou: true,
  displayName: 'Doug',
  scopeLabel: '2025',
  wins: 60,
  losses: 50,
  pushes: 2,
  missed: 0,
  atsAccuracy: 0.545,
  decisions: 110,
  tells: []
};

describe('StatsHero career-rating chip (#738)', () => {
  it('shows the rating, tier and rank on the season hero, linked to the ladder', () => {
    const { getByTestId } = render(StatsHero, {
      props: { ...BASE, careerRating: { entry: RATED, rank: 2 } }
    });

    const chip = getByTestId('career-rating-chip');
    expect(getByTestId('career-rating-chip-value').textContent).toContain('1512');
    expect(chip.textContent).toContain('Career rating');
    expect(chip.textContent).toContain('Sharp');
    expect(chip.textContent).toContain('#2');
    // `view=standings` is load-bearing, not decoration: a bare /league opens the Week tab during a
    // live window (#584), and the ladder only exists in the Standings panel.
    expect(chip.getAttribute('href')).toBe('/league?view=standings&scope=alltime');
  });

  it('spells the career grain out for assistive tech, where the boxed layout says nothing', () => {
    const { getByTestId } = render(StatsHero, {
      props: { ...BASE, careerRating: { entry: RATED, rank: 2 } }
    });

    const label = getByTestId('career-rating-chip').getAttribute('aria-label') ?? '';
    expect(label).toContain('Career rating 1512');
    expect(label).toContain('Sharp');
    expect(label).toContain('#2');
    expect(label).toContain('not this season');
  });

  it('renders nothing at all for an unrated player — silence, not a provisional number', () => {
    const { queryByTestId } = render(StatsHero, {
      props: { ...BASE, careerRating: { entry: UNRATED, rank: null } }
    });

    expect(queryByTestId('career-rating-chip')).toBeNull();
  });

  it('renders nothing when the player has no rating row yet', () => {
    const { queryByTestId } = render(StatsHero, {
      props: { ...BASE, careerRating: { entry: undefined, rank: null } }
    });

    expect(queryByTestId('career-rating-chip')).toBeNull();
  });

  it('drops the rank from the chip while keeping the number, if a rated player has none', () => {
    const { getByTestId } = render(StatsHero, {
      props: { ...BASE, careerRating: { entry: RATED, rank: null } }
    });

    const chip = getByTestId('career-rating-chip');
    expect(chip.textContent).toContain('1512');
    expect(chip.textContent).not.toContain('#');
  });

  it('gives the Career hero the band and never the chip — one number, one size per scope', () => {
    const { getByTestId, queryByTestId } = render(StatsHero, {
      props: { ...BASE, scopeLabel: 'Career', rating: { entry: RATED, rank: 2 } }
    });

    expect(getByTestId('rating-band')).toBeInTheDocument();
    expect(queryByTestId('career-rating-chip')).toBeNull();
  });

  it('shows neither when the season hero is given no rating (the demo snapshot)', () => {
    const { queryByTestId } = render(StatsHero, { props: BASE });

    expect(queryByTestId('rating-band')).toBeNull();
    expect(queryByTestId('career-rating-chip')).toBeNull();
  });
});

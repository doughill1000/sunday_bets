import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import WrappedCard from '../WrappedCard.svelte';

describe('WrappedCard', () => {
  it('renders the label and value', () => {
    render(WrappedCard, { props: { label: 'Season Rank', value: '#3' } });
    expect(screen.getByText('Season Rank')).toBeInTheDocument();
    expect(screen.getByText('#3')).toBeInTheDocument();
  });

  it('renders the sub line when provided', () => {
    render(WrappedCard, { props: { label: 'Season Rank', value: '#3', sub: '142 pts' } });
    expect(screen.getByText('142 pts')).toBeInTheDocument();
  });

  it('does not render a sub line when omitted', () => {
    render(WrappedCard, { props: { label: 'Players', value: '8' } });
    // Just the label and value; no extra sub element
    expect(screen.getByText('Players')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('renders an emoji prefix when provided', () => {
    render(WrappedCard, { props: { label: 'Champion', value: 'Alice', emoji: '🏆' } });
    expect(screen.getByText('Champion')).toBeInTheDocument();
    // emoji is in the same element as value text
    const valueEl = screen.getByText(/🏆/);
    expect(valueEl).toBeInTheDocument();
  });

  it('has the wrapped-card test id', () => {
    render(WrappedCard, { props: { label: 'Record', value: '10-5-1' } });
    expect(screen.getByTestId('wrapped-card')).toBeInTheDocument();
  });
});

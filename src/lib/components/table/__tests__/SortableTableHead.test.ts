import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import SortableTableHead from '$lib/components/table/SortableTableHead.svelte';

describe('SortableTableHead', () => {
  it('renders the label', () => {
    render(SortableTableHead, { props: { label: 'Accuracy', onsort: vi.fn() } });
    expect(screen.getByRole('button')).toHaveTextContent('Accuracy');
  });

  it('is inactive when direction is null', () => {
    const { container } = render(SortableTableHead, {
      props: { label: 'Accuracy', direction: null, onsort: vi.fn() }
    });

    expect(container.querySelector('th')).toHaveAttribute('aria-sort', 'none');
    expect(screen.getByRole('button')).toHaveAccessibleName('Sort by Accuracy');
    // The neutral up/down icon is muted only while inactive.
    expect(container.querySelector('svg')).toHaveClass('text-muted-foreground');
  });

  it('reflects an ascending sort and announces the next (descending) click', () => {
    const { container } = render(SortableTableHead, {
      props: { label: 'Accuracy', direction: 'asc', onsort: vi.fn() }
    });

    expect(container.querySelector('th')).toHaveAttribute('aria-sort', 'ascending');
    expect(screen.getByRole('button')).toHaveAccessibleName('Sort by Accuracy descending');
    expect(container.querySelector('svg')).not.toHaveClass('text-muted-foreground');
  });

  it('reflects a descending sort and announces the next (ascending) click', () => {
    const { container } = render(SortableTableHead, {
      props: { label: 'Accuracy', direction: 'desc', onsort: vi.fn() }
    });

    expect(container.querySelector('th')).toHaveAttribute('aria-sort', 'descending');
    expect(screen.getByRole('button')).toHaveAccessibleName('Sort by Accuracy ascending');
  });

  it('calls onsort when clicked', async () => {
    const onsort = vi.fn();
    render(SortableTableHead, { props: { label: 'Team', direction: null, onsort } });

    await fireEvent.click(screen.getByRole('button'));
    expect(onsort).toHaveBeenCalledOnce();
  });

  it('right-aligns the header when requested', () => {
    const { container } = render(SortableTableHead, {
      props: { label: 'Pts', align: 'right', onsort: vi.fn() }
    });

    expect(container.querySelector('th')).toHaveClass('text-right');
    expect(screen.getByRole('button')).toHaveClass('ml-auto');
  });
});

import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import FormNote from '../FormNote.svelte';

describe('FormNote', () => {
  it('announces success politely with an icon, message, and SR kind label', () => {
    render(FormNote, { props: { kind: 'success', text: 'League rules saved.' } });

    const note = screen.getByRole('status');
    expect(note).toHaveTextContent('League rules saved.');
    // Kind is conveyed non-visually too, so it distinguishes success/error by more
    // than the border colour (audit S4, DESIGN.md principle 10).
    expect(note).toHaveTextContent('Success:');
    // The icon is decorative — the message carries the meaning.
    expect(note.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('announces errors assertively via role="alert"', () => {
    render(FormNote, { props: { kind: 'error', text: 'Could not save.' } });

    const note = screen.getByRole('alert');
    expect(note).toHaveTextContent('Could not save.');
    expect(note).toHaveTextContent('Error:');
    // Errors must not be reachable as a polite status region.
    expect(screen.queryByRole('status')).toBeNull();
  });

  it.each([
    ['warning', 'Over 80% used.'],
    ['info', 'Heads up.']
  ] as const)('renders %s as a polite status region', (kind, text) => {
    render(FormNote, { props: { kind, text } });

    const note = screen.getByRole('status');
    expect(note).toHaveTextContent(text);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

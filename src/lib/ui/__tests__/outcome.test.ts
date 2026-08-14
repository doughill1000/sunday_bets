import { describe, expect, it } from 'vitest';
import { outcomeLabel, outcomeRowClass, outcomeTextClass } from '../outcome';

// Extracted from WeeklyPickCard in #823 so the Weekly tab and the picks board's graded row
// colour a settled result identically. The class maps must keep returning exactly what
// `teamRowClass`/`teamLabelClass` did, or the Weekly tab shifts under an unrelated change.

describe('outcomeTextClass', () => {
  it('maps the three decided outcomes onto the semantic tokens', () => {
    expect(outcomeTextClass('win')).toBe('text-success');
    expect(outcomeTextClass('loss')).toBe('text-destructive');
    expect(outcomeTextClass('push')).toBe('text-warning');
  });

  // Inherit, not muted: every surface showing a miss already flags it in red on its own line.
  it('inherits for missed and for an ungraded row', () => {
    expect(outcomeTextClass('missed')).toBe('');
    expect(outcomeTextClass(null)).toBe('');
    expect(outcomeTextClass(undefined)).toBe('');
  });
});

describe('outcomeRowClass', () => {
  it('tints only win and loss', () => {
    expect(outcomeRowClass('win')).toBe('bg-success/10');
    expect(outcomeRowClass('loss')).toBe('bg-destructive/10');
    expect(outcomeRowClass('push')).toBe('');
    expect(outcomeRowClass(null)).toBe('');
  });
});

describe('outcomeLabel', () => {
  it('pairs the settled word with its points swing', () => {
    expect(outcomeLabel('win', 3)).toBe('Win +3');
    expect(outcomeLabel('loss', -3)).toBe('Loss −3');
    expect(outcomeLabel('missed', -1)).toBe('Missed −1');
  });

  it('drops a zero swing rather than printing "Push +0"', () => {
    expect(outcomeLabel('push', 0)).toBe('Push');
    expect(outcomeLabel('win', 0)).toBe('Win');
  });

  it('stands the word alone when no swing is known', () => {
    expect(outcomeLabel('win')).toBe('Win');
    expect(outcomeLabel('push', null)).toBe('Push');
  });

  // An empty label is the signal the graded row uses to render no verdict chip at all — grading
  // wrote nothing for this member, so there is nothing to claim.
  it('is empty with no outcome', () => {
    expect(outcomeLabel(null, 3)).toBe('');
    expect(outcomeLabel(undefined)).toBe('');
  });
});

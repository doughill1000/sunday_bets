import { describe, it, expect, vi } from 'vitest';
import { dismissTooltipOnScroll } from '../chartTooltip';

describe('dismissTooltipOnScroll', () => {
  it('hides the tooltip when a touch-scroll cancels the pointer', () => {
    const hide = vi.fn();
    const node = document.createElement('div');

    const action = dismissTooltipOnScroll(node, () => ({ tooltip: { hide } }));
    node.dispatchEvent(new Event('pointercancel'));

    expect(hide).toHaveBeenCalledOnce();
    action?.destroy?.();
  });

  it('no-ops when the chart context is not yet bound', () => {
    const node = document.createElement('div');

    const action = dismissTooltipOnScroll(node, () => undefined);

    expect(() => node.dispatchEvent(new Event('pointercancel'))).not.toThrow();
    action?.destroy?.();
  });

  it('stops listening after destroy', () => {
    const hide = vi.fn();
    const node = document.createElement('div');

    const action = dismissTooltipOnScroll(node, () => ({ tooltip: { hide } }));
    action?.destroy?.();
    node.dispatchEvent(new Event('pointercancel'));

    expect(hide).not.toHaveBeenCalled();
  });
});

import type { Action } from 'svelte/action';

/**
 * Dismiss a layerchart tooltip when a touch-scroll cancels the pointer that opened it.
 *
 * layerchart's `TooltipContext` only hides the tooltip on `pointerleave`, but iOS Safari and
 * Android Chrome fire `pointercancel` — not `pointerleave` — when a vertical scroll gesture
 * "steals" the touch that first opened the tooltip (the tooltip area uses `touch-action: pan-y`).
 * Without a `pointercancel` handler the popover freezes on screen after the user scrolls away.
 *
 * Attach to the chart's wrapper element (`pointercancel` bubbles up from the tooltip area) and
 * pass a getter for the chart's bound context, e.g. `use:dismissTooltipOnScroll={() => context}`.
 * Registering the listener via an action keeps it off the declarative `on*` attributes, so it
 * doesn't count as an interaction on a `role="img"` element.
 */
export const dismissTooltipOnScroll: Action<
  HTMLElement,
  () => { tooltip: { hide: () => void } } | undefined
> = (node, getContext) => {
  const dismiss = () => getContext()?.tooltip.hide();
  node.addEventListener('pointercancel', dismiss);
  return {
    destroy() {
      node.removeEventListener('pointercancel', dismiss);
    }
  };
};

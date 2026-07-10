// Shared open-state for the in-app feedback sheet (issue #500). A module-level
// store so multiple entry points — the persistent floating button and the header
// "Beta" tag — drive the same single sheet instance instead of each owning a copy.
import { writable } from 'svelte/store';

export const feedbackOpen = writable(false);

/** Open the feedback sheet from anywhere (e.g. the header Beta tag). */
export function openFeedback() {
  feedbackOpen.set(true);
}

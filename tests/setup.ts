import '@testing-library/jest-dom';
import { vi } from 'vitest';

// jsdom does not implement matchMedia. Svelte's MediaQuery (used by AwardsGuide,
// WelcomeGuide, etc.) calls it on mount, so component tests that transitively
// render a media-query-driven component need this stub.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));
}

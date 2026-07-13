// Theme preference model (issue #532). One vocabulary shared by the SSR class
// injection (src/hooks.server.ts), the DB column (public.users.theme_pref), the
// /api/profile write path, and the Settings "Appearance" control.
//
// The app persists a *mode* — 'dark' | 'light' | 'system' — not a resolved color.
// 'dark'/'light' pin the theme; 'system' follows the OS. The resolved theme is
// carried as the `.dark` class on <html> (present = dark, absent = light Parchment).

export const THEME_MODES = ['dark', 'light', 'system'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

/** The default when a user has no stored preference and for unauthenticated
 *  visitors. Dark, so every existing user keeps today's dark-only experience
 *  until they opt into the Parchment light theme. */
export const DEFAULT_THEME_MODE: ThemeMode = 'dark';

// Address-bar / PWA theme-color per resolved theme (mirrors --background).
const THEME_COLOR = { dark: '#1c1c1c', light: '#f2e7d1' } as const;

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && (THEME_MODES as readonly string[]).includes(value);
}

/** Resolve a mode to a concrete "is dark" boolean. `system` reads the OS preference
 *  in the browser; during SSR it falls back to dark (the app default), matching what
 *  the blocking <head> script in app.html corrects before first paint. */
export function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** The class string SSR writes onto <html> for a mode: 'dark' for dark/system
 *  (the script then narrows system), '' for light. Kept in sync with app.html. */
export function themeClassFor(mode: ThemeMode): string {
  return mode === 'light' ? '' : 'dark';
}

/** Apply a mode to the live document: toggle the `.dark` class, record the mode on
 *  <html data-theme-mode> (so the app.html script's system check stays accurate),
 *  and sync the theme-color meta. Browser-only; a no-op during SSR. Used by the
 *  Settings control so the switch is instant, ahead of the invalidateAll refresh. */
export function applyThemeMode(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;
  const isDark = resolveIsDark(mode);
  const root = document.documentElement;
  root.classList.toggle('dark', isDark);
  root.setAttribute('data-theme-mode', mode);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', isDark ? THEME_COLOR.dark : THEME_COLOR.light);
}

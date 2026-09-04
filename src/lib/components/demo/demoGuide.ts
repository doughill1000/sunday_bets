// First-teach for the public demo (ADR-0026). The authenticated app auto-opens WelcomeGuide
// once per new account (guideSeenAt); the demo has no account, so "seen" is a per-browser
// localStorage flag instead. Kept as a pure function so the open/skip decision is unit-tested
// without a DOM — the component owns the (browser-guarded, try/catch) localStorage access.
export const DEMO_GUIDE_SEEN_KEY = 'hotshot:demo-guide-seen';

export function shouldAutoOpenDemoGuide(p: { seen: string | null; pathname: string }): boolean {
  return p.seen === null && !p.pathname.startsWith('/demo/how-to-play');
}

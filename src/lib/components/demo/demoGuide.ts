// The demo how-to-play popup auto-opens on every /demo visit (ADR-0026, builds on #864): the
// demo is a marketing surface for strangers, so it re-teaches the game each time rather than
// remembering a dismissal. The one exception is the standalone rules page, which already shows
// the same content — don't stack the popup on top of it.
export function shouldAutoOpenDemoGuide(pathname: string): boolean {
  return !pathname.startsWith('/demo/how-to-play');
}

// src/lib/server/observability.ts
//
// Thin wrappers over Sentry spans so the hot server paths emit named,
// inspectable timings without each call site reaching for the Sentry API.
//
// SvelteKit's experimental server `tracing`/`instrumentation` (svelte.config.js)
// already auto-creates spans for `handle` and `load`; these helpers add the
// explicitly-named child spans the scaling-observability baseline depends on
// (issue #190) so an operator can read p50/p95 per hot page and the per-request
// auth-hook DB cost in Sentry. See docs/observability/scaling-signals.md.
import * as Sentry from '@sentry/sveltekit';

/**
 * Run `fn` inside a Sentry span named `name` with op `op`, returning its result.
 * Accepts any thenable (e.g. a Supabase query builder) so DB calls can be
 * wrapped without an extra `await`. Throws propagate; Sentry records the error.
 */
export function traceSpan<T>(name: string, op: string, fn: () => PromiseLike<T>): Promise<T> {
  return Sentry.startSpan({ name, op }, async () => await fn());
}

/**
 * Span for a page `load` function. `name` is the route key, e.g. 'leaderboard'.
 * Op `function.sveltekit.load` matches SvelteKit's own load-span convention so
 * these group with the auto-instrumented spans in the Sentry UI.
 */
export function tracePageLoad<T>(name: string, fn: () => PromiseLike<T>): Promise<T> {
  return traceSpan(`load ${name}`, 'function.sveltekit.load', fn);
}

/**
 * Span for a single database round-trip. `name` identifies the query, e.g.
 * 'auth-hook.users-profile'. Op `db.query` is the Sentry DB-span convention.
 */
export function traceDbQuery<T>(name: string, fn: () => PromiseLike<T>): Promise<T> {
  return traceSpan(name, 'db.query', fn);
}

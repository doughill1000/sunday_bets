// Assembles the technical + app context attached to a feedback submission
// (issue #500, ADR-0028). Runs on the client at submit time; the server endpoint
// enriches it with authoritative fields (user id, season) it must not trust the
// client for. Kept dependency-light and defensive so it never throws on submit and
// stays unit-testable — browser globals are read behind guards.
import * as Sentry from '@sentry/sveltekit';

export type FeedbackKind = 'bug' | 'idea' | 'confused' | 'love';

export interface FeedbackClientContext {
  /** Route the report was filed from. */
  route: string;
  /** Per-deploy build id (Vercel commit SHA) — see __BUILD_ID__ in vite.config.ts. */
  buildId: string;
  /** Inner viewport, for reproducing layout bugs (null outside the browser). */
  viewport: { width: number; height: number } | null;
  userAgent: string | null;
  /** Latest Sentry event id, to deep-link the trace + session replay (null if none). */
  sentryEventId: string | null;
  /** Active group at submit time (null for users with no active group). */
  groupId: string | null;
}

function safeBuildId(): string {
  return typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'unknown';
}

function safeSentryEventId(): string | null {
  try {
    return Sentry.lastEventId() ?? null;
  } catch {
    return null;
  }
}

export function buildFeedbackContext(input: {
  route: string;
  groupId: string | null;
}): FeedbackClientContext {
  const hasWindow = typeof window !== 'undefined';
  return {
    route: input.route,
    buildId: safeBuildId(),
    viewport: hasWindow ? { width: window.innerWidth, height: window.innerHeight } : null,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    sentryEventId: safeSentryEventId(),
    groupId: input.groupId
  };
}

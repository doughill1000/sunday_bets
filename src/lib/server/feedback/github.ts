// GitHub egress for the feedback triage queue (issue #500, ADR-0028).
//
// Filing runs SERVER-SIDE ONLY, admin-gated, human-in-the-loop. Because
// `doughill1000/sunday_bets` is a PUBLIC repo, everything composed here becomes
// world-readable, so this module is the load-bearing sanitization boundary
// (ADR-0028 Decisions 4 + 6):
//   - the user's free text is length-capped, `@mention`/`#ref`-neutralized, and
//     fenced so it cannot inject markdown or ping/cross-link strangers;
//   - only a curated, non-identifying subset of the captured context crosses into
//     the issue. This is an ALLOWLIST, not a denylist — the user-id UUID and the
//     Sentry event id are never read here, so they are structurally unable to leak
//     onto the public surface.
//
// Pure compose/sanitize functions are exported for unit testing; `fileFeedbackIssue`
// takes an injectable `fetch` so tests never hit the live GitHub API.

import type { Json } from '$lib/types/supabase';

/** The single repo this token may file into (ADR-0028 Decision 3). */
export const FEEDBACK_REPO = 'doughill1000/sunday_bets';
/** The one guaranteed label on every filed issue (ADR-0028 Decision 5). */
export const FEEDBACK_LABEL = 'source:feedback';

/** Max characters of user body copied into a public issue (defense-in-depth; the
 *  DB already caps `body` at 4000). */
const MAX_ISSUE_BODY = 4000;
/** Max characters of the snippet used in the issue title. */
const MAX_TITLE = 72;
/** Cap the user-agent line so a public issue isn't dominated by a UA string. */
const MAX_UA = 300;
/** Zero-width space inserted after `@`/`#` to defuse mentions and refs. */
const ZWSP = String.fromCharCode(0x200b);

const KIND_LABEL: Record<string, string> = {
  bug: 'Bug',
  idea: 'Idea',
  confused: 'Confusion',
  love: 'Love'
};

/** The feedback fields filing needs — a subset of the `feedback` Row so a DB row
 *  can be passed straight through. */
export interface FeedbackForFiling {
  kind: string;
  body: string;
  context: Json;
}

export interface ComposedIssue {
  title: string;
  body: string;
  labels: string[];
}

export interface FiledIssue {
  url: string;
  number: number;
}

/** Thrown when the GitHub API rejects a filing. `unauthorized` marks a 401/403
 *  (missing/expired token or insufficient scope) so the caller can fall back to the
 *  prefilled-URL degradation path (ADR-0028 Decision 7). */
export class FeedbackFilingError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly unauthorized: boolean
  ) {
    super(message);
    this.name = 'FeedbackFilingError';
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Break `@mentions` and `#refs` so a filed issue can't ping strangers or
 * accidentally cross-link other issues/PRs (ADR-0028 Decision 4). A zero-width
 * space after the sigil stops GitHub from linkifying it while leaving the text
 * visually intact.
 */
export function neutralizeRefs(text: string): string {
  return text.replace(/@(?=[A-Za-z0-9_-])/g, `@${ZWSP}`).replace(/#(?=\d)/g, `#${ZWSP}`);
}

/**
 * Wrap user text in a fenced code block whose fence is longer than any run of
 * backticks inside it, so the body can never break out of the fence and inject
 * markdown/HTML into the public issue (ADR-0028 Decision 4).
 */
export function fenceBody(text: string): string {
  const longestRun = (text.match(/`+/g) ?? []).reduce((max, run) => Math.max(max, run.length), 0);
  const fence = '`'.repeat(Math.max(3, longestRun + 1));
  return `${fence}\n${text}\n${fence}`;
}

/**
 * The ONLY context fields allowed into a public issue (ADR-0028 Decision 6):
 * route, build id, viewport, user agent. This is an allowlist — user id, Sentry
 * event id, group, season, and anything else are structurally unreachable here, so
 * they can never cross onto the world-readable surface.
 */
export function publicContextLines(context: Json): string[] {
  const c = asRecord(context);
  const lines: string[] = [];

  if (typeof c.route === 'string' && c.route) lines.push(`Route: \`${neutralizeRefs(c.route)}\``);
  if (typeof c.buildId === 'string' && c.buildId) lines.push(`Build: \`${c.buildId}\``);

  const vp = asRecord(c.viewport);
  if (typeof vp.width === 'number' && typeof vp.height === 'number') {
    lines.push(`Viewport: ${vp.width}×${vp.height}`);
  }

  if (typeof c.userAgent === 'string' && c.userAgent) {
    lines.push(`User agent: \`${neutralizeRefs(c.userAgent.slice(0, MAX_UA))}\``);
  }

  return lines;
}

/**
 * Compose the sanitized, public-safe issue for a feedback row. Applies every
 * content control (allowlisted context, ref-neutralized + fenced body, capped
 * length, title from a neutralized snippet) and always carries `source:feedback`.
 */
export function composeFeedbackIssue(row: FeedbackForFiling): ComposedIssue {
  const kindLabel = KIND_LABEL[row.kind] ?? 'Feedback';

  const truncated = row.body.length > MAX_ISSUE_BODY;
  const safeBody = neutralizeRefs(row.body.slice(0, MAX_ISSUE_BODY));
  const fenced = fenceBody(truncated ? `${safeBody}\n…[truncated]` : safeBody);

  const firstLine = row.body.split('\n')[0]?.trim() ?? '';
  const snippet =
    firstLine.length > MAX_TITLE ? `${firstLine.slice(0, MAX_TITLE - 1)}…` : firstLine;
  const title = neutralizeRefs(
    snippet ? `${kindLabel}: ${snippet}` : `${kindLabel} from in-app feedback`
  );

  const parts = [
    '> Filed from in-app feedback via the triage queue (issue #500, ADR-0028).',
    '',
    `**Kind:** ${kindLabel}`,
    '',
    '**Message**',
    fenced
  ];

  const context = publicContextLines(row.context);
  if (context.length) {
    parts.push('', '**Context**', ...context.map((line) => `- ${line}`));
  }

  parts.push(
    '',
    '<sub>Filed from the in-app feedback queue. The reporter’s identity and diagnostic ids are retained privately and are intentionally omitted here.</sub>'
  );

  return { title, body: parts.join('\n'), labels: [FEEDBACK_LABEL] };
}

/**
 * POST a composed issue to the GitHub REST API. Server-only — the token is a
 * fine-grained PAT (Issues: write on this repo only, ADR-0028 Decision 3) and must
 * never reach the client. `fetchFn` is injectable so tests mock the API. A 401/403
 * is surfaced via `FeedbackFilingError.unauthorized` so the caller can degrade to
 * the prefilled-URL path (Decision 7).
 */
export async function fileFeedbackIssue(args: {
  token: string;
  issue: ComposedIssue;
  fetchFn?: typeof fetch;
}): Promise<FiledIssue> {
  const { token, issue, fetchFn = fetch } = args;

  const res = await fetchFn(`https://api.github.com/repos/${FEEDBACK_REPO}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title: issue.title, body: issue.body, labels: issue.labels })
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new FeedbackFilingError(
      `GitHub issue filing failed (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`,
      res.status,
      res.status === 401 || res.status === 403
    );
  }

  const payload = (await res.json()) as { html_url?: string; number?: number };
  if (!payload.html_url || typeof payload.number !== 'number') {
    throw new FeedbackFilingError('GitHub returned no issue URL', res.status, false);
  }
  return { url: payload.html_url, number: payload.number };
}

/**
 * Degradation path (ADR-0028 Decision 7): when the PAT is missing or expired, build
 * a prefilled "new issue" URL the operator opens in their own GitHub session. Carries
 * the same sanitized title/body/label as automated filing, so nothing extra leaks.
 */
export function prefilledIssueUrl(issue: ComposedIssue): string {
  const params = new URLSearchParams({
    title: issue.title,
    body: issue.body,
    labels: issue.labels.join(',')
  });
  return `https://github.com/${FEEDBACK_REPO}/issues/new?${params.toString()}`;
}

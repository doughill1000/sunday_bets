import { describe, it, expect, vi } from 'vitest';
import {
  composeFeedbackIssue,
  fenceBody,
  fileFeedbackIssue,
  FeedbackFilingError,
  neutralizeRefs,
  prefilledIssueUrl,
  publicContextLines,
  FEEDBACK_LABEL,
  FEEDBACK_REPO,
  type ComposedIssue
} from '../github';

// A full captured-context blob: route/build/viewport/UA are public-safe; the rest
// (Sentry event id, group, user id, season) must NEVER cross into a public issue.
const SENTRY_ID = 'evt-deadbeefcafe';
const USER_ID = 'user-6f1e-secret-uuid';
const GROUP_ID = 'grp-9a2b-secret-uuid';
const fullContext = {
  route: '/picks',
  buildId: 'abc1234',
  viewport: { width: 390, height: 844 },
  userAgent: 'Mozilla/5.0 (iPhone) AppleWebKit Safari',
  sentryEventId: SENTRY_ID,
  groupId: GROUP_ID,
  userId: USER_ID,
  seasonYear: 2026
};

function mockResponse(status: number, body: unknown): Response {
  return {
    ok: status < 400,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body)
  } as unknown as Response;
}

describe('neutralizeRefs', () => {
  it('defuses @mentions and #refs so filing cannot ping or cross-link', () => {
    const out = neutralizeRefs('hey @octocat see #123 thanks');
    // The raw, linkable forms must not survive.
    expect(out).not.toContain('@octocat');
    expect(out).not.toContain('#123');
    // The visible text is preserved (only an invisible zero-width space is inserted).
    const zwsp = new RegExp(String.fromCharCode(0x200b), 'g');
    expect(out.replace(zwsp, '')).toBe('hey @octocat see #123 thanks');
  });

  it('leaves ordinary text untouched', () => {
    expect(neutralizeRefs('a normal sentence, no sigils.')).toBe('a normal sentence, no sigils.');
  });
});

describe('fenceBody', () => {
  it('wraps plain text in a triple-backtick fence', () => {
    expect(fenceBody('hello')).toBe('```\nhello\n```');
  });

  it('grows the fence beyond any backtick run so the body cannot break out', () => {
    const malicious = 'text ``` then ```` more';
    const fenced = fenceBody(malicious);
    const openFence = fenced.split('\n')[0];
    // Longest run inside is 4 backticks → fence must be at least 5.
    expect(openFence.length).toBeGreaterThanOrEqual(5);
    // The original content is preserved verbatim inside the fence.
    expect(fenced).toContain(malicious);
    // Fence opens and closes with the same delimiter.
    expect(fenced.endsWith(`\n${openFence}`)).toBe(true);
  });
});

describe('publicContextLines', () => {
  it('emits only the allowlisted subset (route, build, viewport, UA)', () => {
    const lines = publicContextLines(fullContext).join('\n');
    expect(lines).toContain('/picks');
    expect(lines).toContain('abc1234');
    expect(lines).toContain('390×844');
    expect(lines).toContain('Safari');
  });

  it('never emits the user id, Sentry event id, group, or season', () => {
    const lines = publicContextLines(fullContext).join('\n');
    expect(lines).not.toContain(USER_ID);
    expect(lines).not.toContain(SENTRY_ID);
    expect(lines).not.toContain(GROUP_ID);
    expect(lines).not.toContain('2026');
  });

  it('tolerates a non-object / empty context', () => {
    expect(publicContextLines(null)).toEqual([]);
    expect(publicContextLines('nope' as unknown as never)).toEqual([]);
    expect(publicContextLines({})).toEqual([]);
  });
});

describe('composeFeedbackIssue', () => {
  it('produces a titled, labelled, sanitized issue', () => {
    const issue = composeFeedbackIssue({
      kind: 'bug',
      body: 'The picks screen crashes on load',
      context: fullContext
    });
    expect(issue.title).toBe('Bug: The picks screen crashes on load');
    expect(issue.labels).toEqual([FEEDBACK_LABEL]);
    expect(issue.body).toContain('**Kind:** Bug');
    expect(issue.body).toContain('```'); // message is fenced
    expect(issue.body).toContain('/picks'); // allowlisted context present
  });

  it('the full composed issue never leaks identifiers', () => {
    const issue = composeFeedbackIssue({
      kind: 'confused',
      body: 'ping @someone about #999',
      context: fullContext
    });
    const whole = `${issue.title}\n${issue.body}`;
    expect(whole).not.toContain(USER_ID);
    expect(whole).not.toContain(SENTRY_ID);
    expect(whole).not.toContain(GROUP_ID);
    // Mentions/refs in user content are defused everywhere they appear.
    expect(whole).not.toContain('@someone');
    expect(whole).not.toContain('#999');
  });

  it('a body full of backticks cannot break out of the fence', () => {
    const issue = composeFeedbackIssue({
      kind: 'idea',
      body: '``` malicious ``` <script>alert(1)</script>',
      context: {}
    });
    const openFence = issue.body.split('\n').find((l) => /^`{3,}$/.test(l));
    expect(openFence).toBeDefined();
    expect((openFence as string).length).toBeGreaterThanOrEqual(4);
  });

  it('truncates an over-long body', () => {
    const issue = composeFeedbackIssue({
      kind: 'bug',
      body: 'x'.repeat(5000),
      context: {}
    });
    expect(issue.body).toContain('…[truncated]');
  });

  it('falls back to a generic title when the body has no first line', () => {
    const issue = composeFeedbackIssue({ kind: 'love', body: '\n\n', context: {} });
    expect(issue.title).toBe('Love from in-app feedback');
  });
});

describe('fileFeedbackIssue', () => {
  const issue: ComposedIssue = {
    title: 'Bug: something',
    body: 'body',
    labels: [FEEDBACK_LABEL]
  };

  it('POSTs to the repo issues endpoint with the token and labels, and returns the URL', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(
        mockResponse(201, { html_url: `https://github.com/${FEEDBACK_REPO}/issues/42`, number: 42 })
      );

    const result = await fileFeedbackIssue({ token: 'test-token', issue, fetchFn });

    expect(result).toEqual({ url: `https://github.com/${FEEDBACK_REPO}/issues/42`, number: 42 });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`https://api.github.com/repos/${FEEDBACK_REPO}/issues`);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
    const sent = JSON.parse(init.body as string);
    expect(sent.labels).toEqual([FEEDBACK_LABEL]);
    expect(sent.title).toBe('Bug: something');
  });

  it('flags a 401 as unauthorized so the caller can degrade', async () => {
    const fetchFn = vi.fn().mockResolvedValue(mockResponse(401, { message: 'Bad credentials' }));
    const err = await fileFeedbackIssue({ token: 'expired', issue, fetchFn }).catch((e) => e);
    expect(err).toBeInstanceOf(FeedbackFilingError);
    expect((err as FeedbackFilingError).unauthorized).toBe(true);
    expect((err as FeedbackFilingError).status).toBe(401);
  });

  it('does not flag a 422 (validation) as unauthorized', async () => {
    const fetchFn = vi.fn().mockResolvedValue(mockResponse(422, { message: 'Validation Failed' }));
    const err = await fileFeedbackIssue({ token: 'ok', issue, fetchFn }).catch((e) => e);
    expect(err).toBeInstanceOf(FeedbackFilingError);
    expect((err as FeedbackFilingError).unauthorized).toBe(false);
  });

  it('throws when GitHub returns no issue URL', async () => {
    const fetchFn = vi.fn().mockResolvedValue(mockResponse(201, { number: 7 }));
    await expect(fileFeedbackIssue({ token: 'ok', issue, fetchFn })).rejects.toBeInstanceOf(
      FeedbackFilingError
    );
  });
});

describe('prefilledIssueUrl', () => {
  it('builds a new-issue URL with the sanitized title/body/label', () => {
    const issue = composeFeedbackIssue({
      kind: 'bug',
      body: 'crash on submit',
      context: fullContext
    });
    const url = prefilledIssueUrl(issue);
    expect(url.startsWith(`https://github.com/${FEEDBACK_REPO}/issues/new?`)).toBe(true);
    const params = new URL(url).searchParams;
    expect(params.get('title')).toBe('Bug: crash on submit');
    expect(params.get('labels')).toBe(FEEDBACK_LABEL);
    // The degradation path leaks nothing the automated path wouldn't.
    expect(url).not.toContain(USER_ID);
    expect(url).not.toContain(SENTRY_ID);
  });
});

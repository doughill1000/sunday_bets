/**
 * Governance freshness gate (audit 2026-07-02, P1 #4).
 *
 * The two manual `finish-pr` steps that keep docs/adr/*.md and docs/CHANGELOG.md
 * trustworthy — flipping a shipped ADR's Status to Accepted, and logging every merged
 * PR — have no CI backstop, so they lapse silently whenever a PR skips the skill
 * (release/dependabot/hotfix PRs, or a patch cluster). This script is that backstop:
 *
 *   1. ADR staleness — an ADR still `Status: Proposed` whose linked `Issue: #NNN` is
 *      already closed on GitHub means the ratification step was missed.
 *   2. Changelog gaps — a merged PR (to `master`, non-bot, merged on/after the
 *      enforcement cutoff below) with neither its own PR number nor a closed-issue
 *      number it references anywhere in docs/CHANGELOG.md means the changelog step
 *      was missed.
 *
 * The changelog check is deliberately NOT retroactive: docs/CHANGELOG.md pre-dates
 * this gate by weeks and already has real historical gaps (e.g. #330/PR #341 — a
 * confirmed finding of the 2026-07-02 audit that introduced this script). Scanning
 * all history would make the check permanently, un-fixably red on day one. Instead it
 * enforces the rule only for PRs merged after the cutoff, so it catches new drift
 * without demanding a backfill project first. Bump the cutoff (or backfill the gap
 * and move it) if it starts hiding a real new gap behind old history.
 *
 * Requires GITHUB_TOKEN (or GH_TOKEN) and GITHUB_REPOSITORY ("owner/repo") — both are
 * set automatically in GitHub Actions. Not meant to be run outside CI/gh context.
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const ADR_DIR = path.join(REPO_ROOT, 'docs', 'adr');
const CHANGELOG_PATH = path.join(REPO_ROOT, 'docs', 'CHANGELOG.md');
const CHANGELOG_ENFORCEMENT_SINCE = process.env.GOVERNANCE_CHANGELOG_SINCE ?? '2026-07-02';
const BOT_LOGINS = new Set(['dependabot[bot]', 'github-actions[bot]']);

type GitHubIssue = {
  number: number;
  state: 'open' | 'closed';
};

type GitHubPullRequest = {
  number: number;
  title: string;
  body: string | null;
  merged_at: string | null;
  user: { login: string } | null;
};

function githubRepo(): string {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) throw new Error('GITHUB_REPOSITORY is not set (expected "owner/repo").');
  return repo;
}

function githubToken(): string {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN (or GH_TOKEN) is not set.');
  return token;
}

async function githubApi<T>(pathname: string): Promise<T> {
  const res = await fetch(`https://api.github.com${pathname}`, {
    headers: {
      Authorization: `Bearer ${githubToken()}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  if (!res.ok) {
    throw new Error(`GitHub API ${pathname} failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as T;
}

type AdrRecord = {
  file: string;
  status: string;
  issueNumber: number | null;
};

function parseAdr(file: string): AdrRecord | null {
  if (file === 'README.md' || file === '0000-template.md') return null;
  const content = readFileSync(path.join(ADR_DIR, file), 'utf8');
  const statusMatch = content.match(/^- Status:\s*(.+)$/m);
  const issueMatch = content.match(/^- Issue:\s*.*?#(\d+)/m);
  if (!statusMatch) throw new Error(`${file}: no "- Status:" line found`);
  return {
    file,
    status: statusMatch[1].trim(),
    issueNumber: issueMatch ? Number(issueMatch[1]) : null
  };
}

async function checkAdrFreshness(): Promise<string[]> {
  const adrs = readdirSync(ADR_DIR)
    .filter((f) => f.endsWith('.md'))
    .map(parseAdr)
    .filter((a): a is AdrRecord => a !== null)
    .filter((a) => a.status === 'Proposed' && a.issueNumber !== null);

  const failures: string[] = [];
  for (const adr of adrs) {
    const issue = await githubApi<GitHubIssue>(`/repos/${githubRepo()}/issues/${adr.issueNumber}`);
    if (issue.state === 'closed') {
      failures.push(
        `docs/adr/${adr.file}: Status is "Proposed" but linked issue #${adr.issueNumber} is closed — flip to Accepted (or Rejected) per docs/adr/README.md's lifecycle.`
      );
    }
  }
  return failures;
}

/** Closing-keyword issue refs per GitHub's own linking syntax (close/fix/resolve + variants). */
function closingIssueRefs(text: string): number[] {
  const matches = text.matchAll(/\b(?:clos|fix|resolv)e[sd]?\s+#(\d+)/gi);
  return [...matches].map((m) => Number(m[1]));
}

function changelogReferencesAny(changelog: string, numbers: number[]): boolean {
  return numbers.some((n) => new RegExp(`#${n}(?!\\d)`).test(changelog));
}

async function checkChangelogFreshness(): Promise<string[]> {
  const changelog = readFileSync(CHANGELOG_PATH, 'utf8');
  const since = new Date(`${CHANGELOG_ENFORCEMENT_SINCE}T00:00:00Z`);

  const prs = await githubApi<GitHubPullRequest[]>(
    `/repos/${githubRepo()}/pulls?state=closed&base=master&sort=updated&direction=desc&per_page=100`
  );

  const failures: string[] = [];
  for (const pr of prs) {
    if (!pr.merged_at) continue;
    if (new Date(pr.merged_at) < since) continue;
    if (pr.user && BOT_LOGINS.has(pr.user.login)) continue;

    const candidates = [pr.number, ...closingIssueRefs(`${pr.title}\n${pr.body ?? ''}`)];
    if (!changelogReferencesAny(changelog, candidates)) {
      failures.push(
        `PR #${pr.number} ("${pr.title}", merged ${pr.merged_at}) has no docs/CHANGELOG.md entry — add one keyed by its closed issue (#NNN) or "PR #${pr.number}" if it closes none.`
      );
    }
  }
  return failures;
}

async function main() {
  const [adrFailures, changelogFailures] = await Promise.all([
    checkAdrFreshness(),
    checkChangelogFreshness()
  ]);

  const failures = [...adrFailures, ...changelogFailures];
  if (failures.length === 0) {
    console.log('Governance freshness check passed.');
    return;
  }

  console.error(`Governance freshness check failed (${failures.length}):\n`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

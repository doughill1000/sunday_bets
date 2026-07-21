/**
 * Governance freshness gate (audit 2026-07-02, P1 #4).
 *
 * The manual `finish-pr` steps that keep docs/adr/*.md and docs/CHANGELOG.md
 * trustworthy — flipping a shipped ADR's Status to Accepted, and logging every merged
 * PR — have no CI backstop, so they lapse silently whenever a PR skips the skill
 * (release/dependabot/hotfix PRs, or a patch cluster). This script is that backstop:
 *
 *   1. ADR staleness — an ADR still `Status: Proposed` whose linked `Issue: #NNN` is
 *      already closed on GitHub means the ratification step was missed. Since the
 *      2026-07-21 ADR audit this also flags any ADR left `Proposed` beyond
 *      PROPOSED_MAX_AGE_DAYS even when it links no issue, which is the blind spot that
 *      let ADR-0021 and ADR-0036 sit unresolved (see checkAdrFreshness).
 *   2. Changelog gaps (retroactive) — a merged PR (to `master`, non-bot, merged
 *      on/after the enforcement cutoff below) with neither its own PR number nor a
 *      closed-issue number it references anywhere in the changelog corpus
 *      (docs/CHANGELOG.md PLUS the unreleased fragments in docs/changelog.d/) means the
 *      changelog step was missed. Entries ride in a fragment from merge until
 *      `cut-release` assembles them into CHANGELOG.md, so both are searched.
 *   3. Changelog gap (current PR) — on a `pull_request`-triggered run only, the PR
 *      being opened/updated is itself checked for a changelog entry in its diff — a new
 *      docs/changelog.d/ fragment (the normal path) or a docs/CHANGELOG.md edit. This is
 *      what actually stops a merge from shipping without an entry;
 *      check #2 can only catch it retroactively, after the PR has already merged
 *      (its own `docs(changelog): backfill ...` PRs are the evidence this gap is
 *      real, not theoretical).
 *
 * The retroactive changelog check is deliberately NOT full-history: docs/CHANGELOG.md
 * pre-dates this gate by weeks and already has real historical gaps (e.g. #330/PR
 * #341 — a confirmed finding of the 2026-07-02 audit that introduced this script).
 * Scanning all history would make the check permanently, un-fixably red on day one.
 * Instead it enforces the rule only for PRs merged after the cutoff, so it catches
 * new drift without demanding a backfill project first. Bump the cutoff (or backfill
 * the gap and move it) if it starts hiding a real new gap behind old history.
 *
 * Requires GITHUB_TOKEN (or GH_TOKEN) and GITHUB_REPOSITORY ("owner/repo") — both are
 * set automatically in GitHub Actions. Not meant to be run outside CI/gh context.
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const ADR_DIR = path.join(REPO_ROOT, 'docs', 'adr');
const CHANGELOG_PATH = path.join(REPO_ROOT, 'docs', 'CHANGELOG.md');
const FRAGMENTS_DIR = path.join(REPO_ROOT, 'docs', 'changelog.d');
// A bare 'YYYY-MM-DD' is treated as that day's start (UTC); pass a full ISO timestamp
// when the boundary needs to fall between two PRs merged on the same calendar day (as
// it did for the 2026-07-12 changelog squash — see docs/CHANGELOG.md's history note).
const CHANGELOG_ENFORCEMENT_SINCE =
  process.env.GOVERNANCE_CHANGELOG_SINCE ?? '2026-07-12T23:50:00Z';
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

type GitHubPullRequestFile = {
  filename: string;
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
  date: string | null;
};

function parseAdr(file: string): AdrRecord | null {
  if (file === 'README.md' || file === '0000-template.md') return null;
  const content = readFileSync(path.join(ADR_DIR, file), 'utf8');
  const statusMatch = content.match(/^- Status:\s*(.+)$/m);
  const issueMatch = content.match(/^- Issue:\s*.*?#(\d+)/m);
  const dateMatch = content.match(/^- Date:\s*(\d{4}-\d{2}-\d{2})/m);
  if (!statusMatch) throw new Error(`${file}: no "- Status:" line found`);
  return {
    file,
    status: statusMatch[1].trim(),
    issueNumber: issueMatch ? Number(issueMatch[1]) : null,
    date: dateMatch ? dateMatch[1] : null
  };
}

/**
 * A `Proposed` ADR older than this is treated as forgotten rather than in-flight, and must
 * be resolved to Accepted or Rejected. This backstops the `Issue: None` blind spot below.
 */
const PROPOSED_MAX_AGE_DAYS = 30;

function ageInDays(isoDate: string): number {
  return (Date.now() - Date.parse(isoDate)) / 86_400_000;
}

/**
 * Two checks, because one alone leaves a hole the 2026-07 ADR audit fell into:
 *
 *   a. A `Proposed` ADR whose linked issue has closed — the ratification step was missed.
 *   b. A `Proposed` ADR older than PROPOSED_MAX_AGE_DAYS, *regardless of whether it links
 *      an issue*. Check (a) can only see ADRs with a parseable `Issue: #NNN`, so an
 *      `Issue: None — approved plan` ADR was structurally invisible to this gate and could
 *      sit `Proposed` indefinitely. ADR-0021 did exactly that: its driving experiment
 *      (PR #394) was closed unmerged on 2026-07-11 and the ADR still read `Proposed` when
 *      the 2026-07-21 audit found it. ADR-0036 was in the same blind spot.
 */
async function checkAdrFreshness(): Promise<string[]> {
  const proposed = readdirSync(ADR_DIR)
    .filter((f) => f.endsWith('.md'))
    .map(parseAdr)
    .filter((a): a is AdrRecord => a !== null)
    .filter((a) => a.status.startsWith('Proposed'));

  const failures: string[] = [];
  for (const adr of proposed) {
    // (a) linked issue already closed — ratification missed.
    if (adr.issueNumber !== null) {
      const issue = await githubApi<GitHubIssue>(
        `/repos/${githubRepo()}/issues/${adr.issueNumber}`
      );
      if (issue.state === 'closed') {
        failures.push(
          `docs/adr/${adr.file}: Status is "Proposed" but linked issue #${adr.issueNumber} is closed — flip to Accepted (or Rejected) per docs/adr/README.md's lifecycle.`
        );
        continue; // Already failing; don't also report it as merely old.
      }
    }

    // (b) aged out — catches the `Issue: None` ADRs check (a) cannot see.
    if (adr.date !== null && ageInDays(adr.date) > PROPOSED_MAX_AGE_DAYS) {
      const days = Math.floor(ageInDays(adr.date));
      failures.push(
        `docs/adr/${adr.file}: Status has been "Proposed" for ${days} days (limit ${PROPOSED_MAX_AGE_DAYS}) — resolve it to Accepted or Rejected per docs/adr/README.md's lifecycle, or restate the date if it is genuinely still under review.`
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

/**
 * The changelog "corpus" a PR/issue reference can live in: the assembled
 * docs/CHANGELOG.md (released windows) PLUS every unreleased fragment under
 * docs/changelog.d/. An entry rides in a fragment from merge until `cut-release`
 * assembles it into CHANGELOG.md and deletes the fragment, so both must be searched.
 * README.md in the fragments dir is convention docs, not an entry — skip it.
 */
function readChangelogCorpus(): string {
  let corpus = readFileSync(CHANGELOG_PATH, 'utf8');
  let entries: string[];
  try {
    entries = readdirSync(FRAGMENTS_DIR);
  } catch {
    return corpus; // dir absent (pre-migration checkout) — CHANGELOG.md only
  }
  for (const file of entries) {
    if (!file.endsWith('.md') || file === 'README.md') continue;
    corpus += `\n${readFileSync(path.join(FRAGMENTS_DIR, file), 'utf8')}`;
  }
  return corpus;
}

async function checkChangelogFreshness(): Promise<string[]> {
  const changelog = readChangelogCorpus();
  const since = new Date(
    CHANGELOG_ENFORCEMENT_SINCE.includes('T')
      ? CHANGELOG_ENFORCEMENT_SINCE
      : `${CHANGELOG_ENFORCEMENT_SINCE}T00:00:00Z`
  );

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

/**
 * Gates the PR actually being opened/updated, not just history. Only meaningful on a
 * `pull_request`-triggered run — PR_NUMBER is unset on the daily `schedule` run, which
 * has no "current PR" to check, so this returns early and leaves that run to
 * checkChangelogFreshness()'s retroactive sweep.
 */
async function checkCurrentPrChangelog(): Promise<string[]> {
  const prNumber = process.env.PR_NUMBER;
  if (!prNumber) return [];

  const author = process.env.PR_AUTHOR ?? '';
  if (BOT_LOGINS.has(author)) return [];

  const labels = (process.env.PR_LABELS ?? '').split(',').map((l) => l.trim());
  if (labels.includes('changelog-exempt')) return [];

  const files = await githubApi<GitHubPullRequestFile[]>(
    `/repos/${githubRepo()}/pulls/${prNumber}/files?per_page=100`
  );
  // The entry normally arrives as a new docs/changelog.d/ fragment; a direct
  // docs/CHANGELOG.md edit (e.g. a release squash) also counts. The fragments-dir
  // README is convention docs, not an entry.
  const touchesChangelog = files.some(
    (f) =>
      f.filename === 'docs/CHANGELOG.md' ||
      (f.filename.startsWith('docs/changelog.d/') &&
        f.filename.endsWith('.md') &&
        f.filename !== 'docs/changelog.d/README.md')
  );
  if (touchesChangelog) return [];

  return [
    `This PR (#${prNumber}) has no changelog entry in its diff — add a ` +
      `docs/changelog.d/ fragment (see the finish-pr skill's step 3), or apply the ` +
      `"changelog-exempt" label if this genuinely doesn't need one.`
  ];
}

async function main() {
  const [adrFailures, changelogFailures, currentPrFailures] = await Promise.all([
    checkAdrFreshness(),
    checkChangelogFreshness(),
    checkCurrentPrChangelog()
  ]);

  const failures = [...adrFailures, ...changelogFailures, ...currentPrFailures];
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

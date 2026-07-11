/**
 * Brand-token guard (follow-up to #231 Hotshot rebrand; #476 scales, #530 raw hex).
 *
 * Fails the lint step if any .svelte file under src bypasses the semantic brand
 * tokens defined in src/app.css. Two classes of violation are caught:
 *
 *  1. Raw Tailwind color *scales* — `text-yellow-500`, `bg-green-400` (#476).
 *  2. Raw *hex* literals — `#dba73b`, `color: #2fbf71`, `#rgb` / `#rrggbb` /
 *     `#rrggbbaa` (#530). Inline hex can't respond to a theme switch, so the
 *     light-theme follow-up needs it gone; reach for a token instead.
 *
 * New surfaces should reach for a token, not a scale or a literal, so the app
 * stays on-brand and theme-ready as it grows (see docs/agent-context/design-system.md).
 *
 * Why a script and not an ESLint rule: ESLint's `no-restricted-syntax` operates
 * on the JS/TS AST and can't see the string contents of a Svelte template's
 * `class="…"` / `style="…"` attribute, so it can't catch these. Wiring this into
 * `pnpm lint` (see package.json) gives the check local + CI parity — the same
 * path prettier and eslint already run through.
 *
 * Disambiguating hex from issue refs: `#530` in prose is lexically identical to a
 * 3-digit hex color. Two defenses keep issue references from tripping the guard:
 *   • the hex scan runs on a comment-stripped copy (issue refs in `//` and
 *     `<!-- -->` comments vanish), with line numbers preserved; and
 *   • 6-/8-digit hex (`#dba73b`, unambiguous colors) is flagged anywhere, but
 *     3-/4-digit hex is flagged only in a CSS/attribute *value* position (after
 *     `:`, `=`, a quote, or a comma) — so `(issue #500)` in visible body text is
 *     left alone while `style="color:#f00"` is caught.
 * The scale scan still runs on raw lines (scales practically never appear in prose).
 *
 * Allowlist: genuinely non-tokenizable hex — external brand marks and per-user
 * generated colors — is exempted below. Contributors can also mark a single line
 * with a `brand-color-allow` comment for a new dynamic source, rather than
 * editing this script.
 *
 * Scope note: the vendored shadcn-svelte directory (src/lib/components/ui) is
 * skipped — it is eslint-ignored and must not be hand-edited
 * (docs/agent-context/ui.md). Only .svelte files are scanned, matching the
 * issue's acceptance criterion; class strings built in a component's `<script>`
 * block are still caught because the whole file's text is scanned.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const SCAN_ROOT = path.join(REPO_ROOT, 'src');
const SKIP_DIRS = [path.join('src', 'lib', 'components', 'ui')];

// Tailwind utility prefixes that take a color, and the palette + numeric scale
// that mark a raw color (as opposed to a token like `text-primary`, which has no
// numeric step and so never matches).
const PREFIXES =
  'bg|text|border|ring|from|to|via|fill|stroke|shadow|decoration|outline|divide|accent|caret';
const PALETTE =
  'red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone';
const SCALE = '50|100|200|300|400|500|600|700|800|900|950';
const RAW_SCALE = new RegExp(`\\b(?:${PREFIXES})-(?:${PALETTE})-(?:${SCALE})\\b`, 'g');

// 6-/8-digit hex (`#rrggbb`, `#rrggbbaa`) is an unambiguous color — flag it
// anywhere. The lookbehind rejects HTML entities (`&#123;`) and word-joined `#`.
const RAW_HEX_LONG = /(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6})\b/g;
// 3-/4-digit hex (`#rgb`, `#rgba`) collides with issue numbers (`#500`), so flag
// it only in a CSS/attribute value position — right after `:`, `=`, a quote, or a
// comma (gradient stop), optionally with whitespace. match[1] is the hex itself.
const RAW_HEX_SHORT = /[:="',]\s*(#(?:[0-9a-fA-F]{4}|[0-9a-fA-F]{3}))\b/g;

// A line carrying this marker opts out of the hex check (documented escape hatch
// for a new genuinely-dynamic source, so contributors don't edit this script).
const INLINE_ALLOW = 'brand-color-allow';

// Non-tokenizable hex, exempted by file + value. Keep this list short and
// justified — every entry is a color that legitimately cannot become a theme token.
const HEX_ALLOWLIST: { file: string; hex: RegExp }[] = [
  // Google's official "Sign in with Google" mark — fixed external brand colors.
  { file: 'src/routes/auth/+page.svelte', hex: /^#(?:4285F4|34A853|FBBC05|EA4335)$/i },
  // White label over a per-user generated avatar background (the background hue
  // is dynamic; see src/lib/avatars.ts). UserAvatar generation stays as-is (#530).
  { file: 'src/lib/components/UserAvatar.svelte', hex: /^#(?:fff|ffffff)$/i }
];

type Violation = { file: string; line: number; token: string; kind: 'scale' | 'hex' };

function svelteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(REPO_ROOT, full);
    if (SKIP_DIRS.some((skip) => rel === skip || rel.startsWith(skip + path.sep))) continue;
    if (entry.isDirectory()) {
      out.push(...svelteFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.svelte')) {
      out.push(full);
    }
  }
  return out;
}

// Blank out comment regions while preserving newlines and length, so the hex scan
// ignores issue references in prose without shifting any line numbers. Heuristic
// by design: `://` is protected so URLs aren't mistaken for line comments; the
// only failure mode is a missed hex hidden inside a comment-like string, never a
// false positive on real prose.
function stripComments(src: string): string {
  const blank = (s: string) => s.replace(/[^\n]/g, ' ');
  return src
    .replace(/<!--[\s\S]*?-->/g, blank) // HTML comments
    .replace(/\/\*[\s\S]*?\*\//g, blank) // block comments (JS + CSS)
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1: string) => p1 + ' '.repeat(m.length - p1.length));
}

function isAllowedHex(relFile: string, token: string, line: string): boolean {
  if (line.includes(INLINE_ALLOW)) return true;
  return HEX_ALLOWLIST.some((e) => e.file === relFile && e.hex.test(token));
}

function findViolations(file: string): Violation[] {
  const violations: Violation[] = [];
  // Normalize to POSIX separators so the forward-slash HEX_ALLOWLIST entries match on
  // Windows too (path.relative yields backslashes there, silently missing the allowlist).
  const relFile = path.relative(REPO_ROOT, file).split(path.sep).join('/');
  const raw = readFileSync(file, 'utf8');
  const rawLines = raw.split('\n');
  const hexLines = stripComments(raw).split('\n');

  rawLines.forEach((line, index) => {
    for (const match of line.matchAll(RAW_SCALE)) {
      violations.push({ file: relFile, line: index + 1, token: match[0], kind: 'scale' });
    }
  });

  hexLines.forEach((line, index) => {
    const hits = [
      ...[...line.matchAll(RAW_HEX_LONG)].map((m) => m[0]),
      ...[...line.matchAll(RAW_HEX_SHORT)].map((m) => m[1])
    ];
    for (const token of hits) {
      if (isAllowedHex(relFile, token, rawLines[index] ?? '')) continue;
      violations.push({ file: relFile, line: index + 1, token, kind: 'hex' });
    }
  });

  return violations;
}

const violations = svelteFiles(SCAN_ROOT).flatMap(findViolations);

if (violations.length === 0) {
  console.log('brand-colors: no raw Tailwind color scales or hex literals in src/**/*.svelte.');
  process.exitCode = 0;
} else {
  console.error(
    `brand-colors: ${violations.length} raw brand-color violation(s) in src/**/*.svelte.\n` +
      'Use a semantic brand token from src/app.css instead of a raw scale or hex literal:\n' +
      '  gold / brass (crowns, trophies)      -> text-primary / var(--primary)\n' +
      '  win / positive                       -> text-success / var(--success)\n' +
      '  loss / negative                      -> text-destructive / var(--destructive)\n' +
      '  caution / push / small-sample        -> text-warning / var(--warning)\n' +
      '  muted neutral                        -> text-muted-foreground / var(--muted-foreground)\n' +
      'A genuinely dynamic source can be allowlisted in scripts/check-brand-colors.ts\n' +
      `or marked inline with a ${INLINE_ALLOW} comment.\n`
  );
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  ${v.token}  (${v.kind})`);
  }
  process.exitCode = 1;
}

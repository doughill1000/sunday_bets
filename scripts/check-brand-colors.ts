/**
 * Brand-token guard (follow-up to #231 Hotshot rebrand, issue #476).
 *
 * Fails the lint step if any .svelte file under src uses a raw Tailwind color
 * scale (e.g. `text-yellow-500`, `bg-green-400`) instead of the semantic brand
 * tokens defined in src/app.css. New surfaces should reach for a token, not a
 * scale, so the app stays on-brand as it grows.
 *
 * Why a script and not an ESLint rule: ESLint's `no-restricted-syntax` operates
 * on the JS/TS AST and can't see the string contents of a Svelte template's
 * `class="…"` attribute, so it can't catch these. Wiring this into `pnpm lint`
 * (see package.json) gives the check local + CI parity — the same path prettier
 * and eslint already run through.
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

type Violation = { file: string; line: number; token: string };

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

function findViolations(file: string): Violation[] {
  const violations: Violation[] = [];
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    for (const match of line.matchAll(RAW_SCALE)) {
      violations.push({
        file: path.relative(REPO_ROOT, file),
        line: index + 1,
        token: match[0]
      });
    }
  });
  return violations;
}

const violations = svelteFiles(SCAN_ROOT).flatMap(findViolations);

if (violations.length === 0) {
  console.log('brand-colors: no raw Tailwind color scales in src/**/*.svelte.');
  process.exitCode = 0;
} else {
  console.error(
    `brand-colors: ${violations.length} raw Tailwind color scale(s) found in src/**/*.svelte.\n` +
      'Use a semantic brand token from src/app.css instead of a raw scale:\n' +
      '  gold / brass (crowns, trophies)      -> text-primary\n' +
      '  win / positive                       -> text-success\n' +
      '  loss / negative                      -> text-destructive\n' +
      '  caution / push / small-sample        -> text-warning\n' +
      '  muted neutral                        -> text-muted-foreground\n'
  );
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  ${v.token}`);
  }
  process.exitCode = 1;
}

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export type LedgerEntry = {
  hash: string;
  signature?: string;
  migration?: string;
  migrationHash?: string;
};

export type Ledger = Record<string, LedgerEntry>;

export type SourceFile = {
  key: string;
  content: string;
  hash: string;
  signature?: string;
  primaryObjectCount: number;
  phase: string;
};

export type GeneratorOptions = {
  root: string;
  ledgerPath: string;
  migrationDir: string;
  migrationName?: string;
  bootstrap?: boolean;
  check?: boolean;
  now?: Date;
  /** Keys (e.g. "schemas/0217_foo.sql") to retire via `--retire=<key>`. */
  retire?: string[];
  /** Undo the newest uncommitted migration and regenerate. */
  amend?: boolean;
  /** Repo root used for `git show` / `git status` lookups. Defaults to process.cwd(). */
  repoRoot?: string;
};

export const SOURCE_ORDER = [
  'schemas',
  'indexes',
  'views',
  'functions',
  'policies',
  'triggers',
  'grants',
  'comments'
] as const;

// Emptied by the ADR-0012 migration rebaseline (PR2): the three formerly-frozen
// multi-object sources (0100_enums, 0200_tables, handle_new_auth_user) were split
// into one-object-per-file, so no source is exempt from the one-primary-object rule
// anymore. Kept as the single switch if a future bulk import ever needs the exemption.
const LEGACY_MULTI_OBJECT_SOURCES = new Set<string>();

function sha(content: string) {
  return crypto.createHash('sha256').update(content.replace(/\r\n?/g, '\n')).digest('hex');
}

function getArg(argv: string[], prefix: string) {
  const argument = argv.find((value) => value.startsWith(prefix));
  return argument?.slice(prefix.length);
}

function getRepeatedArg(argv: string[], prefix: string): string[] {
  return argv
    .filter((value) => value.startsWith(prefix))
    .map((value) => value.slice(prefix.length));
}

function walkSqlFiles(directory: string, files: string[] = []) {
  if (!fs.existsSync(directory)) return files;

  const entries = fs
    .readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walkSqlFiles(entryPath, files);
    else if (entry.isFile() && entry.name.endsWith('.sql')) files.push(entryPath);
  }

  return files;
}

function extractSignature(sql: string): string | undefined {
  const explicit = sql.match(/^\s*--\s*@signature:\s*([^\r\n]+)\s*$/im);
  if (explicit) return explicit[1].trim();

  const functionMatches = [
    ...sql.matchAll(/create\s+or\s+replace\s+function\s+([a-z0-9_."]+)\s*\(([\s\S]*?)\)/gi)
  ];
  if (functionMatches.length !== 1) return undefined;

  const [, rawName, rawArguments] = functionMatches[0];
  const name = rawName.replace(/\s+/g, '');
  const argumentsWithoutDefaults = rawArguments.replace(/\s+default\s+[^,]+/gi, '');
  const argumentTypes = argumentsWithoutDefaults
    .split(',')
    .map((argument) => argument.trim())
    .filter(Boolean)
    .map((argument) =>
      argument
        .replace(/\b(in|out|inout)\b/gi, '')
        .trim()
        .replace(/^[a-z_][a-z0-9_]*\s+/i, '')
    )
    .join(', ');

  return `${name}(${argumentTypes})`;
}

function extractPhaseOverride(sql: string, key: string): string | undefined {
  const match = sql.match(/^\s*--\s*@phase:\s*([^\r\n]+)\s*$/im);
  if (!match) return undefined;

  const value = match[1].trim();
  if (!(SOURCE_ORDER as readonly string[]).includes(value)) {
    throw new Error(
      `Invalid "-- @phase: ${value}" override in ${key}. Must be one of: ${SOURCE_ORDER.join(', ')}.`
    );
  }
  return value;
}

function countPrimaryObjects(sql: string) {
  const patterns = [
    /\bcreate\s+table\b/gi,
    /\bcreate\s+type\b/gi,
    /\bcreate\s+(?:or\s+replace\s+)?(?:materialized\s+)?view\b/gi,
    /\bcreate\s+(?:or\s+replace\s+)?function\b/gi
  ];

  return patterns.reduce((count, pattern) => count + (sql.match(pattern)?.length ?? 0), 0);
}

/**
 * Locate the earliest-occurring primary object (table/type/view/function) in a
 * source file's content. Used by `--retire` to synthesize a drop for the object a
 * deleted source file used to define.
 */
type RetiredObject =
  | { kind: 'table'; name: string }
  | { kind: 'type'; name: string }
  | { kind: 'view'; name: string; materialized: boolean }
  | { kind: 'function' };

function extractFirstPrimaryObject(sql: string): RetiredObject | undefined {
  const candidates: { index: number; object: RetiredObject }[] = [];

  const tableMatch = /\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?([a-z0-9_."]+)/i.exec(sql);
  if (tableMatch) {
    candidates.push({ index: tableMatch.index, object: { kind: 'table', name: tableMatch[1] } });
  }

  const typeMatch = /\bcreate\s+type\s+([a-z0-9_."]+)/i.exec(sql);
  if (typeMatch) {
    candidates.push({ index: typeMatch.index, object: { kind: 'type', name: typeMatch[1] } });
  }

  const viewMatch = /\bcreate\s+(?:or\s+replace\s+)?(materialized\s+)?view\s+([a-z0-9_."]+)/i.exec(
    sql
  );
  if (viewMatch) {
    candidates.push({
      index: viewMatch.index,
      object: { kind: 'view', name: viewMatch[2], materialized: Boolean(viewMatch[1]) }
    });
  }

  const functionMatch = /\bcreate\s+(?:or\s+replace\s+)?function\b/i.exec(sql);
  if (functionMatch) {
    candidates.push({ index: functionMatch.index, object: { kind: 'function' } });
  }

  if (candidates.length === 0) return undefined;
  candidates.sort((a, b) => a.index - b.index);
  return candidates[0].object;
}

function buildRetireDrop(
  key: string,
  content: string,
  ledgerEntry: LedgerEntry | undefined
): string {
  const object = extractFirstPrimaryObject(content);
  if (!object) return `-- retired (no object to drop): ${key}`;

  switch (object.kind) {
    case 'table':
      return `-- retired: ${key}\ndrop table if exists ${object.name};`;
    case 'type':
      return `-- retired: ${key}\ndrop type if exists ${object.name};`;
    case 'view':
      return `-- retired: ${key}\ndrop ${object.materialized ? 'materialized ' : ''}view if exists ${object.name};`;
    case 'function': {
      const signature = ledgerEntry?.signature ?? extractSignature(content);
      if (!signature) {
        throw new Error(
          `--retire=${key}: cannot determine the function signature to drop. Restore the file ` +
            `and add a "-- @signature: schema.function(argument_types)" header first.`
        );
      }
      return `-- retired: ${key}\ndrop function if exists ${signature};`;
    }
  }
}

export function collectSources(root: string): SourceFile[] {
  const absoluteFiles = SOURCE_ORDER.flatMap((folder) =>
    walkSqlFiles(path.join(root, folder)).map((absolutePath) => ({ absolutePath, folder }))
  );

  const sources = absoluteFiles.map(({ absolutePath, folder }) => {
    const content = `${fs.readFileSync(absolutePath, 'utf8').replace(/\r\n?/g, '\n').trim()}\n`;
    const key = path.relative(root, absolutePath).replaceAll('\\', '/');
    const phase = extractPhaseOverride(content, key) ?? folder;
    return {
      key,
      content,
      hash: sha(content),
      signature: extractSignature(content),
      primaryObjectCount: countPrimaryObjects(content),
      phase
    };
  });

  const phaseIndex = new Map<string, number>(SOURCE_ORDER.map((phase, index) => [phase, index]));
  return sources
    .map((source, index) => ({ source, index }))
    .sort((a, b) => {
      const phaseDelta =
        (phaseIndex.get(a.source.phase) ?? 0) - (phaseIndex.get(b.source.phase) ?? 0);
      return phaseDelta !== 0 ? phaseDelta : a.index - b.index;
    })
    .map(({ source }) => source);
}

function validateObjectLayout(sources: SourceFile[], ledger: Ledger, bootstrap: boolean) {
  const violations = sources.flatMap((source) => {
    if (source.primaryObjectCount <= 1) return [];

    const previous = ledger[source.key];
    const isUnchangedLegacy =
      LEGACY_MULTI_OBJECT_SOURCES.has(source.key) &&
      (previous?.hash === source.hash || (bootstrap && !previous));
    if (isUnchangedLegacy) return [];

    return [`${source.key}: ${source.primaryObjectCount} primary objects`];
  });

  if (violations.length > 0) {
    throw new Error(
      `SQL source files must define at most one primary table, type, view, or function:\n- ${violations.join(
        '\n- '
      )}\nSplit each object into its own logically named source file.`
    );
  }
}

/**
 * Files whose basename starts with digits share a "numeric prefix" within a
 * directory (e.g. `schemas/0215_comments.sql` and `schemas/0215_schedule_game_id.sql`).
 * Pre-existing collisions (both sides already in the ledger) are grandfathered with a
 * warning; a newly added file that introduces or joins a collision is a hard error.
 */
function checkPrefixCollisions(sources: SourceFile[], ledger: Ledger) {
  const groups = new Map<string, SourceFile[]>();

  for (const source of sources) {
    const directory = path.posix.dirname(source.key);
    const basename = path.posix.basename(source.key);
    const match = basename.match(/^(\d+)/);
    if (!match) continue;

    const groupKey = `${directory}/${match[1]}`;
    const list = groups.get(groupKey) ?? [];
    list.push(source);
    groups.set(groupKey, list);
  }

  for (const [, group] of groups) {
    if (group.length < 2) continue;

    const keys = group.map((source) => source.key);
    const allGrandfathered = group.every((source) => ledger[source.key] !== undefined);

    if (allGrandfathered) {
      console.warn(`Warning: duplicate numeric prefix (grandfathered): ${keys.join(', ')}`);
    } else {
      throw new Error(
        `Duplicate numeric prefix: ${keys.join(
          ', '
        )}\nGive the new file a distinct numeric prefix in its directory.`
      );
    }
  }
}

function readLedger(ledgerPath: string, allowMissing: boolean): Ledger {
  let contents: string;

  try {
    contents = fs.readFileSync(ledgerPath, 'utf8');
  } catch (error) {
    if (allowMissing && (error as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw new Error(`Unable to read migration ledger at ${ledgerPath}`, { cause: error });
  }

  try {
    const parsed: unknown = JSON.parse(contents);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('expected a JSON object');
    }
    const ledger = parsed as Record<string, unknown>;
    for (const [source, value] of Object.entries(ledger)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`${source} must be a ledger entry object`);
      }

      const entry = value as Record<string, unknown>;
      if (typeof entry.hash !== 'string' || !/^[a-f0-9]{64}$/.test(entry.hash)) {
        throw new Error(`${source} has an invalid source hash`);
      }
      for (const field of ['signature', 'migration', 'migrationHash']) {
        if (entry[field] !== undefined && typeof entry[field] !== 'string') {
          throw new Error(`${source}.${field} must be a string`);
        }
      }
    }

    return ledger as Ledger;
  } catch (error) {
    throw new Error(`Invalid migration ledger at ${ledgerPath}`, { cause: error });
  }
}

function writeLedger(ledgerPath: string, ledger: Ledger) {
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  const temporaryPath = `${ledgerPath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
  fs.renameSync(temporaryPath, ledgerPath);
}

function validateMigrationReferences(ledger: Ledger, migrationDir: string) {
  const failures: string[] = [];
  const verified = new Map<string, string>();

  for (const [source, entry] of Object.entries(ledger)) {
    if (!entry.migration && !entry.migrationHash) continue;
    if (!entry.migration || !entry.migrationHash) {
      failures.push(`${source}: incomplete migration metadata`);
      continue;
    }

    const migrationPath = path.join(migrationDir, entry.migration);
    let actualHash = verified.get(migrationPath);
    if (!actualHash) {
      if (!fs.existsSync(migrationPath)) {
        failures.push(`${source}: referenced migration is missing (${entry.migration})`);
        continue;
      }
      actualHash = sha(fs.readFileSync(migrationPath, 'utf8'));
      verified.set(migrationPath, actualHash);
    }

    if (actualHash !== entry.migrationHash) {
      failures.push(`${source}: referenced migration was modified (${entry.migration})`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Migration ledger references are invalid:\n- ${failures.join('\n- ')}`);
  }
}

function utcTimestamp(date: Date) {
  return date.toISOString().replace(/[-:T]/g, '').slice(0, 14);
}

function validateMigrationName(name: string) {
  if (!/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(name)) {
    throw new Error(
      `Invalid migration name "${name}". Use lowercase letters, numbers, and single underscores.`
    );
  }
}

function migrationHeader() {
  return `-- generated by supabase/scripts/generate-migration.ts
set check_function_bodies = off;
set client_min_messages = warning;
`;
}

function runGit(repoRoot: string, args: string[]): { ok: boolean; stdout: string } {
  const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
  return { ok: result.status === 0, stdout: result.stdout ?? '' };
}

function findLatestMigrationFile(migrationDir: string): string | undefined {
  if (!fs.existsSync(migrationDir)) return undefined;
  const files = fs.readdirSync(migrationDir).filter((name) => name.endsWith('.sql'));
  if (files.length === 0) return undefined;
  // Filenames are UTC-timestamp-prefixed, so lexicographic max == newest.
  return [...files].sort().at(-1);
}

/**
 * `--amend`: undo the most recently generated, not-yet-committed migration (revert
 * the ledger entries it touched back to their HEAD state, delete the migration file)
 * so a fresh `pnpm db:migration` can regenerate a single clean migration after
 * editing `supabase/src/**` post-generation.
 */
function performAmend(options: GeneratorOptions, repoRoot: string) {
  const latest = findLatestMigrationFile(options.migrationDir);
  if (!latest) {
    throw new Error('--amend: no migration files found to amend.');
  }

  const migrationPath = path.join(options.migrationDir, latest);
  const relativeMigrationPath = path.relative(repoRoot, migrationPath).replaceAll('\\', '/');
  const status = runGit(repoRoot, [
    'status',
    '--porcelain',
    '--',
    relativeMigrationPath
  ]).stdout.trim();
  const isUncommitted = status.startsWith('??') || status.startsWith('A');
  if (!isUncommitted) {
    throw new Error(
      `--amend: cannot amend a committed migration (${latest}). Only the most recently generated, not-yet-committed migration can be amended.`
    );
  }

  const relativeLedgerPath = path.relative(repoRoot, options.ledgerPath).replaceAll('\\', '/');
  const headLedgerResult = runGit(repoRoot, ['show', `HEAD:${relativeLedgerPath}`]);
  if (!headLedgerResult.ok) {
    throw new Error('--amend: HEAD has no committed migration ledger to restore from.');
  }
  const headLedger = JSON.parse(headLedgerResult.stdout) as Ledger;

  const currentLedger = readLedger(options.ledgerPath, true);
  for (const [key, entry] of Object.entries(currentLedger)) {
    if (entry.migration !== latest) continue;
    if (headLedger[key]) currentLedger[key] = headLedger[key];
    else delete currentLedger[key];
  }
  writeLedger(options.ledgerPath, currentLedger);
  fs.unlinkSync(migrationPath);
  console.log(`--amend: reverted ${latest} and restored its ledger entries from HEAD.`);
}

export function runGenerator(options: GeneratorOptions) {
  if (options.bootstrap && options.check) {
    throw new Error('--bootstrap and --check cannot be used together.');
  }

  const retireKeys = [...new Set(options.retire ?? [])];
  if (retireKeys.length > 0 && (options.bootstrap || options.check)) {
    throw new Error('--retire cannot be used with --bootstrap or --check.');
  }
  if (options.amend && (options.bootstrap || options.check)) {
    throw new Error('--amend cannot be used with --bootstrap or --check.');
  }

  const repoRoot = options.repoRoot ?? process.cwd();

  if (options.amend) {
    performAmend(options, repoRoot);
  }

  const sources = collectSources(options.root);
  if (sources.length === 0) {
    throw new Error(`No SQL source files found under ${options.root}.`);
  }

  const ledger = readLedger(options.ledgerPath, Boolean(options.bootstrap));
  validateObjectLayout(sources, ledger, Boolean(options.bootstrap));
  validateMigrationReferences(ledger, options.migrationDir);
  if (!options.bootstrap) {
    checkPrefixCollisions(sources, ledger);
  }

  const currentKeys = new Set(sources.map((source) => source.key));
  const staleKeys = Object.keys(ledger).filter((key) => !currentKeys.has(key));
  const changes = sources.filter((source) => ledger[source.key]?.hash !== source.hash);

  if (options.bootstrap) {
    const bootstrapped = Object.fromEntries(
      sources.map((source) => {
        const previous = ledger[source.key];
        return [
          source.key,
          previous?.hash === source.hash
            ? previous
            : { hash: source.hash, signature: source.signature }
        ];
      })
    );
    writeLedger(options.ledgerPath, bootstrapped);
    console.log(`Bootstrapped ledger with ${sources.length} entries. No migration written.`);
    return;
  }

  for (const key of retireKeys) {
    if (currentKeys.has(key)) {
      throw new Error(`--retire=${key}: file still exists on disk; delete it before retiring.`);
    }
    if (!ledger[key]) {
      throw new Error(`--retire=${key}: no ledger entry found for this key.`);
    }
  }

  const retireSet = new Set(retireKeys);
  const uncoveredStaleKeys = staleKeys.filter((key) => !retireSet.has(key));
  if (uncoveredStaleKeys.length > 0) {
    throw new Error(
      `Deleted or moved SQL sources detected:\n- ${uncoveredStaleKeys.join(
        '\n- '
      )}\nRestore them, or intentionally remove them with --retire=<key>.`
    );
  }

  if (options.check) {
    if (changes.length > 0) {
      throw new Error(
        `SQL sources have changes without a generated migration:\n- ${changes
          .map((change) => change.key)
          .join('\n- ')}`
      );
    }
    console.log(`Migration source integrity check passed (${sources.length} files).`);
    return;
  }

  const willWriteMigration = changes.length > 0 || retireKeys.length > 0;
  if (!willWriteMigration) {
    console.log('No SQL source changes detected.');
    return;
  }

  if (!options.migrationName) {
    throw new Error('A migration name is required: pass --name=describe_the_change');
  }
  validateMigrationName(options.migrationName);

  fs.mkdirSync(options.migrationDir, { recursive: true });
  const migrationFile = `${utcTimestamp(options.now ?? new Date())}_${options.migrationName}.sql`;
  const migrationPath = path.join(options.migrationDir, migrationFile);

  const retireBlocks = retireKeys.map((key) => {
    const relativePath = path
      .relative(repoRoot, path.join(options.root, key))
      .replaceAll('\\', '/');
    const result = runGit(repoRoot, ['show', `HEAD:${relativePath}`]);
    if (!result.ok) {
      throw new Error(
        `--retire=${key}: unable to recover committed content via "git show HEAD:${relativePath}" (was it ever committed?).`
      );
    }
    return buildRetireDrop(key, result.stdout, ledger[key]);
  });

  for (const change of changes) {
    if (/\bcreate\s+(?:or\s+replace\s+)?function\b/i.test(change.content) && !change.signature) {
      console.warn(
        `Warning: ${change.key} defines a function but no signature could be extracted (and no "-- @signature" header is present). A future signature change on this file will not emit an automatic drop.`
      );
    }
  }

  const drops = changes.flatMap((change) => {
    const previousSignature = ledger[change.key]?.signature;
    if (!previousSignature || !change.signature || previousSignature === change.signature)
      return [];
    return [
      `-- drop for signature change: ${change.key}\ndrop function if exists ${previousSignature};`
    ];
  });

  const body = [
    migrationHeader(),
    retireBlocks.length > 0 ? `-- retired sources\n${retireBlocks.join('\n\n')}\n` : '',
    drops.length > 0 ? `-- signature-adjustment drops\n${drops.join('\n')}\n` : '',
    ...changes.map((change) => `-- file: ${change.key}\n${change.content}`)
  ].join('\n');

  fs.writeFileSync(migrationPath, body, { encoding: 'utf8', flag: 'wx' });
  const migrationHash = sha(body);

  for (const key of retireKeys) {
    delete ledger[key];
  }
  for (const change of changes) {
    ledger[change.key] = {
      hash: change.hash,
      signature: change.signature,
      migration: migrationFile,
      migrationHash
    };
  }
  writeLedger(options.ledgerPath, ledger);

  console.log(
    `Wrote ${migrationPath} with ${changes.length} change(s) and ${retireKeys.length} retirement(s).`
  );
}

/** Parses argv into GeneratorOptions. Exported so the bare `--name` check is testable. */
export function resolveCliOptions(argv: string[]): GeneratorOptions {
  if (argv.includes('--name')) {
    throw new Error('--name requires a value: use --name=describe_the_change');
  }

  const root = path.resolve(
    process.cwd(),
    getArg(argv, '--root=') ?? process.env.SQLSRC_ROOT ?? 'supabase/src'
  );
  const migrationDir = path.resolve(process.cwd(), 'supabase/migrations');

  return {
    root,
    ledgerPath: path.resolve(root, '..', '.migration-hash.json'),
    migrationDir,
    migrationName: getArg(argv, '--name=') ?? process.env.MIGRATION_NAME,
    bootstrap: argv.includes('--bootstrap'),
    check: argv.includes('--check'),
    amend: argv.includes('--amend'),
    retire: getRepeatedArg(argv, '--retire='),
    repoRoot: process.cwd()
  };
}

function main() {
  runGenerator(resolveCliOptions(process.argv));
}

const entrypoint = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : undefined;
if (entrypoint === import.meta.url) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

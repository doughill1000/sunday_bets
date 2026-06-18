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

type SourceFile = {
  key: string;
  content: string;
  hash: string;
  signature?: string;
  primaryObjectCount: number;
};

export type GeneratorOptions = {
  root: string;
  ledgerPath: string;
  migrationDir: string;
  migrationName: string;
  bootstrap?: boolean;
  check?: boolean;
  now?: Date;
};

const SOURCE_ORDER = [
  'schemas',
  'indexes',
  'views',
  'functions',
  'policies',
  'triggers',
  'grants',
  'comments'
] as const;

const LEGACY_MULTI_OBJECT_SOURCES = new Set([
  'schemas/0100_enums.sql',
  'schemas/0200_tables.sql',
  'functions/auth/handle_new_auth_user.sql'
]);

function sha(content: string) {
  return crypto.createHash('sha256').update(content.replace(/\r\n?/g, '\n')).digest('hex');
}

function getArg(prefix: string) {
  const argument = process.argv.find((value) => value.startsWith(prefix));
  return argument?.slice(prefix.length);
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

function countPrimaryObjects(sql: string) {
  const patterns = [
    /\bcreate\s+table\b/gi,
    /\bcreate\s+type\b/gi,
    /\bcreate\s+(?:or\s+replace\s+)?(?:materialized\s+)?view\b/gi,
    /\bcreate\s+(?:or\s+replace\s+)?function\b/gi
  ];

  return patterns.reduce((count, pattern) => count + (sql.match(pattern)?.length ?? 0), 0);
}

function collectSources(root: string): SourceFile[] {
  const absoluteFiles = SOURCE_ORDER.flatMap((folder) => walkSqlFiles(path.join(root, folder)));

  return absoluteFiles.map((absolutePath) => {
    const content = `${fs.readFileSync(absolutePath, 'utf8').replace(/\r\n?/g, '\n').trim()}\n`;
    return {
      key: path.relative(root, absolutePath).replaceAll('\\', '/'),
      content,
      hash: sha(content),
      signature: extractSignature(content),
      primaryObjectCount: countPrimaryObjects(content)
    };
  });
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

export function runGenerator(options: GeneratorOptions) {
  if (options.bootstrap && options.check) {
    throw new Error('--bootstrap and --check cannot be used together.');
  }

  const sources = collectSources(options.root);
  if (sources.length === 0) {
    throw new Error(`No SQL source files found under ${options.root}.`);
  }

  const ledger = readLedger(options.ledgerPath, Boolean(options.bootstrap));
  validateObjectLayout(sources, ledger, Boolean(options.bootstrap));
  validateMigrationReferences(ledger, options.migrationDir);

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

  if (staleKeys.length > 0) {
    throw new Error(
      `Deleted or moved SQL sources detected:\n- ${staleKeys.join(
        '\n- '
      )}\nRestore them, or add explicit DROP SQL and intentionally remove their ledger entries.`
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

  if (changes.length === 0) {
    console.log('No SQL source changes detected.');
    return;
  }

  validateMigrationName(options.migrationName);
  fs.mkdirSync(options.migrationDir, { recursive: true });
  const migrationFile = `${utcTimestamp(options.now ?? new Date())}_${options.migrationName}.sql`;
  const migrationPath = path.join(options.migrationDir, migrationFile);

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
    drops.length > 0 ? `-- signature-adjustment drops\n${drops.join('\n')}\n` : '',
    ...changes.map((change) => `-- file: ${change.key}\n${change.content}`)
  ].join('\n');

  fs.writeFileSync(migrationPath, body, { encoding: 'utf8', flag: 'wx' });
  const migrationHash = sha(body);

  for (const change of changes) {
    ledger[change.key] = {
      hash: change.hash,
      signature: change.signature,
      migration: migrationFile,
      migrationHash
    };
  }
  writeLedger(options.ledgerPath, ledger);

  console.log(`Wrote ${migrationPath} with ${changes.length} change(s).`);
}

function main() {
  const root = path.resolve(
    process.cwd(),
    getArg('--root=') ?? process.env.SQLSRC_ROOT ?? 'supabase/src'
  );
  const migrationDir = path.resolve(process.cwd(), 'supabase/migrations');

  runGenerator({
    root,
    ledgerPath: path.resolve(root, '..', '.migration-hash.json'),
    migrationDir,
    migrationName: getArg('--name=') ?? process.env.MIGRATION_NAME ?? 'migrations_patch',
    bootstrap: process.argv.includes('--bootstrap'),
    check: process.argv.includes('--check')
  });
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

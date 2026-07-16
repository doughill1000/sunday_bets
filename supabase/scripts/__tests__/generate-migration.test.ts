import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  collectSources,
  resolveCliOptions,
  runGenerator,
  type GeneratorOptions
} from '../generate-migration';

const temporaryDirectories: string[] = [];

function initGitRepo(directory: string) {
  execSync('git init -q', { cwd: directory });
  execSync('git config user.email test@example.com', { cwd: directory });
  execSync('git config user.name "Test User"', { cwd: directory });
}

function gitCommitAll(directory: string, message: string) {
  execSync('git add -A', { cwd: directory });
  execSync(`git commit -q -m "${message}"`, { cwd: directory });
}

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sunday-bets-migrations-'));
  temporaryDirectories.push(directory);

  const root = path.join(directory, 'src');
  const migrationDir = path.join(directory, 'migrations');
  const ledgerPath = path.join(directory, '.migration-hash.json');
  fs.mkdirSync(path.join(root, 'functions'), { recursive: true });
  fs.mkdirSync(migrationDir, { recursive: true });
  fs.writeFileSync(
    path.join(root, 'functions', 'example.sql'),
    'create or replace function public.example() returns int language sql as $$ select 1 $$;\n'
  );

  const options: GeneratorOptions = {
    root,
    migrationDir,
    ledgerPath,
    migrationName: 'test_change',
    now: new Date('2026-06-18T12:34:56Z')
  };

  return { directory, root, migrationDir, ledgerPath, options };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('generate-migration', () => {
  it('requires an explicit bootstrap when the ledger is missing', () => {
    const { options } = fixture();

    expect(() => runGenerator(options)).toThrow('Unable to read migration ledger');
  });

  it('bootstraps and verifies an unchanged source tree', () => {
    const { options, ledgerPath } = fixture();

    runGenerator({ ...options, bootstrap: true });

    expect(() => runGenerator({ ...options, check: true })).not.toThrow();
    const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    expect(ledger['functions/example.sql'].hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects source changes that have no generated migration', () => {
    const { options, root } = fixture();
    runGenerator({ ...options, bootstrap: true });
    fs.appendFileSync(path.join(root, 'functions', 'example.sql'), '-- changed\n');

    expect(() => runGenerator({ ...options, check: true })).toThrow(
      'SQL sources have changes without a generated migration'
    );
  });

  it('normalizes line endings when hashing SQL', () => {
    const { options, root } = fixture();
    const sourcePath = path.join(root, 'functions', 'example.sql');
    const sql = fs.readFileSync(sourcePath, 'utf8');
    fs.writeFileSync(sourcePath, sql.replace(/\n/g, '\r\n'));
    runGenerator({ ...options, bootstrap: true });

    fs.writeFileSync(sourcePath, sql);

    expect(() => runGenerator({ ...options, check: true })).not.toThrow();
  });

  it('rejects new files containing multiple primary objects', () => {
    const { options, root } = fixture();
    fs.writeFileSync(
      path.join(root, 'functions', 'multiple.sql'),
      [
        'create function public.first() returns int language sql as $$ select 1 $$;',
        'create function public.second() returns int language sql as $$ select 2 $$;'
      ].join('\n')
    );

    expect(() => runGenerator({ ...options, bootstrap: true })).toThrow(
      'SQL source files must define at most one primary table, type, view, or function'
    );
  });

  it('no longer exempts formerly-legacy multi-object bundles (ADR-0012 rebaseline)', () => {
    const { options, root } = fixture();
    fs.rmSync(path.join(root, 'functions'), { recursive: true });
    fs.mkdirSync(path.join(root, 'schemas'));
    const legacyPath = path.join(root, 'schemas', '0200_tables.sql');
    fs.writeFileSync(legacyPath, 'create table first(id int);\ncreate table second(id int);\n');

    // The ADR-0012 history squash emptied LEGACY_MULTI_OBJECT_SOURCES: the formerly
    // frozen bundle paths (0100_enums, 0200_tables, handle_new_auth_user) were split
    // into one-object files, so no path is exempt from the one-primary-object rule —
    // they now throw even on bootstrap, just like any other multi-object file.
    expect(() => runGenerator({ ...options, bootstrap: true })).toThrow(
      'SQL source files must define at most one primary table, type, view, or function'
    );
  });

  it('ties generated ledger entries to the migration content', () => {
    const { options, root, migrationDir, ledgerPath } = fixture();
    runGenerator({ ...options, bootstrap: true });
    fs.appendFileSync(path.join(root, 'functions', 'example.sql'), '-- changed\n');

    runGenerator(options);

    const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    const entry = ledger['functions/example.sql'];
    expect(entry.migration).toBe('20260618123456_test_change.sql');
    expect(entry.migrationHash).toMatch(/^[a-f0-9]{64}$/);
    expect(() => runGenerator({ ...options, check: true })).not.toThrow();

    fs.appendFileSync(path.join(migrationDir, entry.migration), '-- modified\n');
    expect(() => runGenerator({ ...options, check: true })).toThrow(
      'referenced migration was modified'
    );
  });

  it('validates migration names before writing files', () => {
    const { options, root } = fixture();
    runGenerator({ ...options, bootstrap: true });
    fs.appendFileSync(path.join(root, 'functions', 'example.sql'), '-- changed\n');

    expect(() => runGenerator({ ...options, migrationName: '../unsafe name' })).toThrow(
      'Invalid migration name'
    );
  });

  it('never overwrites an existing migration filename', () => {
    const { options, root, migrationDir } = fixture();
    runGenerator({ ...options, bootstrap: true });
    fs.appendFileSync(path.join(root, 'functions', 'example.sql'), '-- changed\n');
    const migrationPath = path.join(migrationDir, '20260618123456_test_change.sql');
    fs.writeFileSync(migrationPath, '-- existing\n');

    expect(() => runGenerator(options)).toThrow(/EEXIST/);
    expect(fs.readFileSync(migrationPath, 'utf8')).toBe('-- existing\n');
  });

  it('fails closed for malformed ledgers', () => {
    const { options, ledgerPath } = fixture();
    fs.writeFileSync(ledgerPath, '{not-json');

    expect(() => runGenerator({ ...options, check: true })).toThrow('Invalid migration ledger');
  });

  it('requires deleted or moved sources to be handled explicitly', () => {
    const { options, root } = fixture();
    runGenerator({ ...options, bootstrap: true });
    fs.unlinkSync(path.join(root, 'functions', 'example.sql'));
    fs.mkdirSync(path.join(root, 'views'));
    fs.writeFileSync(path.join(root, 'views', 'replacement.sql'), 'select 1;\n');

    expect(() => runGenerator(options)).toThrow('Deleted or moved SQL sources detected');
    expect(() => runGenerator(options)).toThrow('--retire=<key>');
  });

  it('requires a migration name before writing a migration', () => {
    const { options, root } = fixture();
    runGenerator({ ...options, bootstrap: true });
    fs.appendFileSync(path.join(root, 'functions', 'example.sql'), '-- changed\n');

    expect(() => runGenerator({ ...options, migrationName: undefined })).toThrow(
      'A migration name is required'
    );
  });

  it('rejects a bare --name argument with no value', () => {
    expect(() => resolveCliOptions(['node', 'generate-migration.ts', '--name'])).toThrow(
      '--name requires a value'
    );
  });

  it('warns when a changed function file has no extractable signature', () => {
    const { options, root } = fixture();
    runGenerator({ ...options, bootstrap: true });
    // Plain `create function` (no "or replace") is a single primary object but
    // extractSignature() only parses the "create or replace function" shape.
    fs.writeFileSync(
      path.join(root, 'functions', 'example.sql'),
      'create function public.example() returns int language sql as $$ select 2 $$;\n'
    );

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      runGenerator(options);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('no signature could be extracted')
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  describe('@phase override', () => {
    it('keeps the default folder-order emission byte-identical when unused', () => {
      const { root } = fixture();
      fs.mkdirSync(path.join(root, 'schemas'));
      fs.writeFileSync(
        path.join(root, 'schemas', '0001_a.sql'),
        'create table public.a(id int);\n'
      );

      const sources = collectSources(root);
      expect(sources.map((source) => source.key)).toEqual([
        'schemas/0001_a.sql',
        'functions/example.sql'
      ]);
    });

    it('reorders emission by the declared @phase override', () => {
      const { root } = fixture();
      fs.mkdirSync(path.join(root, 'schemas'));
      // Overridden to a later phase ("triggers") so it must sort AFTER the
      // functions-folder file, which stays in its natural (earlier) phase.
      fs.writeFileSync(
        path.join(root, 'schemas', '0001_early.sql'),
        '-- @phase: triggers\ncreate table public.early(id int);\n'
      );

      const sources = collectSources(root);
      const order = sources.map((source) => source.key);
      expect(order.indexOf('functions/example.sql')).toBeLessThan(
        order.indexOf('schemas/0001_early.sql')
      );
    });

    it('errors on an invalid @phase value, naming the file', () => {
      const { root } = fixture();
      fs.mkdirSync(path.join(root, 'schemas'));
      fs.writeFileSync(
        path.join(root, 'schemas', '0001_bad.sql'),
        '-- @phase: not_a_real_phase\ncreate table public.bad(id int);\n'
      );

      expect(() => collectSources(root)).toThrow(/schemas\/0001_bad\.sql/);
    });
  });

  describe('duplicate numeric prefix guard', () => {
    it('warns (does not throw) when both colliding files are already grandfathered in the ledger', () => {
      const { options, root } = fixture();
      fs.mkdirSync(path.join(root, 'schemas'));
      fs.writeFileSync(
        path.join(root, 'schemas', '0001_a.sql'),
        'create table public.a(id int);\n'
      );
      fs.writeFileSync(
        path.join(root, 'schemas', '0001_b.sql'),
        'create table public.b(id int);\n'
      );

      // Bootstrap skips the collision guard entirely, so both grandfather in.
      runGenerator({ ...options, bootstrap: true });

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        expect(() => runGenerator({ ...options, check: true })).not.toThrow();
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('duplicate numeric prefix'));
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('throws when a newly added file introduces or joins a collision', () => {
      const { options, root } = fixture();
      fs.mkdirSync(path.join(root, 'schemas'));
      fs.writeFileSync(
        path.join(root, 'schemas', '0001_a.sql'),
        'create table public.a(id int);\n'
      );
      runGenerator({ ...options, bootstrap: true });

      fs.writeFileSync(
        path.join(root, 'schemas', '0001_b.sql'),
        'create table public.b(id int);\n'
      );

      expect(() => runGenerator({ ...options, check: true })).toThrow('Duplicate numeric prefix');
    });
  });

  describe('--retire', () => {
    it('rejects --retire combined with --check or --bootstrap', () => {
      const { options } = fixture();
      expect(() =>
        runGenerator({ ...options, retire: ['functions/gone.sql'], check: true })
      ).toThrow('--retire cannot be used');
      expect(() =>
        runGenerator({ ...options, retire: ['functions/gone.sql'], bootstrap: true })
      ).toThrow('--retire cannot be used');
    });

    it('rejects retiring a key with no ledger entry', () => {
      const { options } = fixture();
      runGenerator({ ...options, bootstrap: true });

      expect(() => runGenerator({ ...options, retire: ['functions/never_existed.sql'] })).toThrow(
        'no ledger entry found'
      );
    });

    it('rejects retiring a key that still exists on disk', () => {
      const { options } = fixture();
      runGenerator({ ...options, bootstrap: true });

      expect(() => runGenerator({ ...options, retire: ['functions/example.sql'] })).toThrow(
        'still exists on disk'
      );
    });

    it('emits a drop table for a retired table source, using the last-committed content', () => {
      const { options, root, directory, migrationDir } = fixture();
      fs.mkdirSync(path.join(root, 'schemas'));
      fs.writeFileSync(
        path.join(root, 'schemas', '0001_widgets.sql'),
        'create table if not exists public.widgets(id int);\n'
      );
      runGenerator({ ...options, bootstrap: true });

      initGitRepo(directory);
      gitCommitAll(directory, 'initial');

      fs.unlinkSync(path.join(root, 'schemas', '0001_widgets.sql'));

      runGenerator({
        ...options,
        retire: ['schemas/0001_widgets.sql'],
        repoRoot: directory,
        migrationName: 'retire_widgets'
      });

      const migrationFile = fs
        .readdirSync(migrationDir)
        .find((name) => name.includes('retire_widgets'));
      expect(migrationFile).toBeDefined();
      const body = fs.readFileSync(path.join(migrationDir, migrationFile!), 'utf8');
      expect(body).toContain('drop table if exists public.widgets;');

      const ledger = JSON.parse(fs.readFileSync(options.ledgerPath, 'utf8'));
      expect(ledger['schemas/0001_widgets.sql']).toBeUndefined();
    });

    it('emits a drop function using the ledger-recorded signature', () => {
      const { options, root, directory, migrationDir } = fixture();
      // Keep a second source file around so the tree isn't empty once
      // functions/example.sql (the one being retired) is deleted.
      fs.mkdirSync(path.join(root, 'schemas'));
      fs.writeFileSync(
        path.join(root, 'schemas', '0001_keep.sql'),
        'create table public.keep(id int);\n'
      );
      // The default fixture function file already has a parseable signature.
      runGenerator({ ...options, bootstrap: true });

      initGitRepo(directory);
      gitCommitAll(directory, 'initial');

      fs.unlinkSync(path.join(root, 'functions', 'example.sql'));

      runGenerator({
        ...options,
        retire: ['functions/example.sql'],
        repoRoot: directory,
        migrationName: 'retire_example'
      });

      const migrationFile = fs
        .readdirSync(migrationDir)
        .find((name) => name.includes('retire_example'));
      const body = fs.readFileSync(path.join(migrationDir, migrationFile!), 'utf8');
      expect(body).toContain('drop function if exists public.example();');
    });

    it('emits a no-drop comment for an alter-only retired file (consolidation case)', () => {
      const { options, root, directory, migrationDir } = fixture();
      fs.mkdirSync(path.join(root, 'schemas'));
      fs.writeFileSync(
        path.join(root, 'schemas', '0001_alter_only.sql'),
        'alter table public.foo add column bar int;\n'
      );
      runGenerator({ ...options, bootstrap: true });

      initGitRepo(directory);
      gitCommitAll(directory, 'initial');

      fs.unlinkSync(path.join(root, 'schemas', '0001_alter_only.sql'));

      runGenerator({
        ...options,
        retire: ['schemas/0001_alter_only.sql'],
        repoRoot: directory,
        migrationName: 'consolidate'
      });

      const migrationFile = fs
        .readdirSync(migrationDir)
        .find((name) => name.includes('consolidate'));
      const body = fs.readFileSync(path.join(migrationDir, migrationFile!), 'utf8');
      expect(body).toContain('-- retired (no object to drop): schemas/0001_alter_only.sql');
      expect(body).not.toMatch(/drop (table|type|view|function)/);
    });

    it('errors when the retired file was never committed to git', () => {
      const { options, root, directory } = fixture();
      fs.mkdirSync(path.join(root, 'schemas'));
      fs.writeFileSync(
        path.join(root, 'schemas', '0001_uncommitted.sql'),
        'create table public.uncommitted(id int);\n'
      );
      runGenerator({ ...options, bootstrap: true });

      initGitRepo(directory);
      // Note: no commit — the file is in the ledger but was never committed.

      fs.unlinkSync(path.join(root, 'schemas', '0001_uncommitted.sql'));

      expect(() =>
        runGenerator({
          ...options,
          retire: ['schemas/0001_uncommitted.sql'],
          repoRoot: directory,
          migrationName: 'retire_uncommitted'
        })
      ).toThrow('unable to recover committed content');
    });

    it('allows --retire with zero changed source files (drops only)', () => {
      const { options, root, directory, migrationDir } = fixture();
      fs.mkdirSync(path.join(root, 'schemas'));
      fs.writeFileSync(
        path.join(root, 'schemas', '0001_widgets.sql'),
        'create table public.widgets(id int);\n'
      );
      runGenerator({ ...options, bootstrap: true });

      initGitRepo(directory);
      gitCommitAll(directory, 'initial');

      fs.unlinkSync(path.join(root, 'schemas', '0001_widgets.sql'));

      runGenerator({
        ...options,
        retire: ['schemas/0001_widgets.sql'],
        repoRoot: directory,
        migrationName: 'drops_only'
      });

      const migrationFile = fs
        .readdirSync(migrationDir)
        .find((name) => name.includes('drops_only'));
      expect(migrationFile).toBeDefined();
    });
  });

  describe('--amend', () => {
    it('errors when there is no migration to amend', () => {
      const { options } = fixture();
      expect(() => runGenerator({ ...options, amend: true })).toThrow(
        'no migration files found to amend'
      );
    });

    it('rejects --amend combined with --check or --bootstrap', () => {
      const { options } = fixture();
      expect(() => runGenerator({ ...options, amend: true, check: true })).toThrow(
        '--amend cannot be used'
      );
      expect(() => runGenerator({ ...options, amend: true, bootstrap: true })).toThrow(
        '--amend cannot be used'
      );
    });

    it('errors when HEAD has no committed ledger to restore from', () => {
      const { options, root, directory } = fixture();
      runGenerator({ ...options, bootstrap: true });
      fs.appendFileSync(path.join(root, 'functions', 'example.sql'), '-- changed\n');
      runGenerator(options);

      initGitRepo(directory); // git repo exists, but nothing is committed yet

      expect(() => runGenerator({ ...options, amend: true, repoRoot: directory })).toThrow(
        'HEAD has no committed migration ledger'
      );
    });

    it('errors when the newest migration is already committed', () => {
      const { options, root, directory } = fixture();
      runGenerator({ ...options, bootstrap: true });
      fs.appendFileSync(path.join(root, 'functions', 'example.sql'), '-- changed\n');
      runGenerator(options);

      initGitRepo(directory);
      gitCommitAll(directory, 'includes generated migration');

      expect(() => runGenerator({ ...options, amend: true, repoRoot: directory })).toThrow(
        'cannot amend a committed migration'
      );
    });

    it('reverts the uncommitted migration and ledger, then regenerates a fresh one', () => {
      const { options, root, directory, migrationDir, ledgerPath } = fixture();
      runGenerator({ ...options, bootstrap: true });

      initGitRepo(directory);
      gitCommitAll(directory, 'initial (bootstrap ledger, no migration yet)');

      fs.appendFileSync(path.join(root, 'functions', 'example.sql'), '-- first change\n');
      runGenerator(options);

      const firstMigration = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'))[
        'functions/example.sql'
      ].migration;
      expect(fs.existsSync(path.join(migrationDir, firstMigration))).toBe(true);

      // Edit src again before committing — the documented "fix it up" scenario.
      fs.appendFileSync(path.join(root, 'functions', 'example.sql'), '-- second change\n');

      runGenerator({
        ...options,
        amend: true,
        repoRoot: directory,
        now: new Date('2026-06-19T00:00:00Z')
      });

      expect(fs.existsSync(path.join(migrationDir, firstMigration))).toBe(false);
      const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
      const finalMigration = ledger['functions/example.sql'].migration;
      expect(finalMigration).not.toBe(firstMigration);
      expect(fs.existsSync(path.join(migrationDir, finalMigration))).toBe(true);

      // Only one migration file should remain — the amended one, not two stacked.
      expect(fs.readdirSync(migrationDir)).toEqual([finalMigration]);
    });
  });
});

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runGenerator, type GeneratorOptions } from '../generate-migration';

const temporaryDirectories: string[] = [];

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
  });
});

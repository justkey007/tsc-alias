import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { isImportablePath } from '../src/utils/path-validator';

describe('isImportablePath', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(__dirname, 'temp-path-validator-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('does not treat a directory without an entry point as importable', () => {
    const moduleDir = join(tempDir, 'mqtt');
    mkdirSync(moduleDir);
    writeFileSync(join(moduleDir, 'portal.js'), '');

    expect(isImportablePath(moduleDir, ['js', 'json'])).toBe(false);
  });

  it('treats a directory with an index file as importable', () => {
    const moduleDir = join(tempDir, 'mqtt');
    mkdirSync(moduleDir);
    writeFileSync(join(moduleDir, 'index.js'), '');

    expect(isImportablePath(moduleDir, ['js', 'json'])).toBe(true);
  });

  it('treats a file with a configured extension as importable', () => {
    const modulePath = join(tempDir, 'mqtt.js');
    writeFileSync(modulePath, '');

    expect(isImportablePath(join(tempDir, 'mqtt'), ['js', 'json'])).toBe(true);
  });
});

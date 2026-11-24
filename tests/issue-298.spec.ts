import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { AliasReplacerArguments } from '../src/interfaces';
import replaceBaseUrlImport from '../src/replacers/base-url.replacer';
import { PathCache } from '../src/utils/path-cache';

describe('issue 298: baseUrl imports when outDir mirrors the parent of baseUrl', () => {
  let projectDir: string;
  let outPath: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'temp-issue-298-'));
    outPath = join(projectDir, 'dist');
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  function write(path: string): string {
    const filename = join(outPath, path);
    mkdirSync(dirname(filename), { recursive: true });
    writeFileSync(filename, 'module.exports = {};');
    return filename;
  }

  function replace(orig: string, file: string, baseUrl: string): string {
    const output = { debug: () => {}, assert: () => {} };
    const config = { outPath, baseUrl, pathCache: new PathCache(false, ['js']), output };
    return replaceBaseUrlImport({ orig, file, config } as unknown as AliasReplacerArguments);
  }

  it('resolves against outDir/baseUrl when tsc emits under dist/src', () => {
    write('src/lib/b.js');
    const file = write('src/lib/deep/c.js');
    expect(replace('require("lib/b")', file, './src')).toBe('require("../../lib/b")');
  });

  it('falls back to outDir when tsc emits directly into dist', () => {
    write('lib/b.js');
    const file = write('lib/deep/c.js');
    expect(replace('require("lib/b")', file, './src')).toBe('require("../../lib/b")');
  });

  it('keeps resolving against outDir for baseUrl "."', () => {
    write('lib/b.js');
    const file = write('lib/deep/c.js');
    expect(replace('require("lib/b")', file, '.')).toBe('require("../../lib/b")');
  });

  it('leaves the import alone when no candidate exists', () => {
    const file = write('src/lib/deep/c.js');
    expect(replace('require("lib/missing")', file, './src')).toBe('require("lib/missing")');
  });
});

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { findBasePathOfAlias } from '../src/helpers/path-base';
import { resolveNestedBaseUrlPath } from '../src/helpers/path-base-nested';
import { IProjectConfig } from '../src/interfaces';
import { PathCache } from '../src/utils/path-cache';

const testDir = join(__dirname, '../temp-test-nested-baseurl');
const buildDir = join(testDir, 'build');
const jslibUtilsDir = join(buildDir, 'src/jslib/utils');

beforeAll(() => {
  if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
  mkdirSync(jslibUtilsDir, { recursive: true });
  writeFileSync(join(jslibUtilsDir, 'math.js'), 'module.exports = {};');
});

afterAll(() => {
  if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
});

describe('Nested baseUrl resolution', () => {
  it('should return undefined when baseUrl is root / dot', () => {
    const config = {
      baseUrl: '.',
      outDir: buildDir,
      configDir: testDir,
      pathCache: new PathCache(false)
    } as unknown as IProjectConfig;

    const result = resolveNestedBaseUrlPath('utils', config);
    expect(result).toBeUndefined();
  });

  it('should return undefined when baseUrl is a parent-relative path (../)', () => {
    const config = {
      baseUrl: '../',
      outDir: buildDir,
      configDir: testDir,
      pathCache: new PathCache(false)
    } as unknown as IProjectConfig;

    const result = resolveNestedBaseUrlPath('utils', config);
    expect(result).toBeUndefined();
  });

  it('should resolve correct basePath when baseUrl is a nested subdirectory', () => {
    const config = {
      baseUrl: './src/jslib',
      outDir: buildDir,
      configDir: testDir,
      hasExtraModule: false,
      pathCache: new PathCache(false)
    } as unknown as IProjectConfig;

    const result = resolveNestedBaseUrlPath('utils', config);
    expect(result).toBe(join(buildDir, 'src/jslib').replace(/\\/g, '/'));
  });

  it('findBasePathOfAlias should assign nested basePath for subfolder baseUrl', () => {
    const config = {
      baseUrl: './src/jslib',
      outDir: buildDir,
      configDir: testDir,
      hasExtraModule: false,
      pathCache: new PathCache(false)
    } as unknown as IProjectConfig;

    const resolveAlias = findBasePathOfAlias(config);
    const aliasPath = resolveAlias('utils');

    expect(aliasPath.isExtra).toBe(false);
    expect(aliasPath.basePath).toBe(join(buildDir, 'src/jslib').replace(/\\/g, '/'));
  });
});

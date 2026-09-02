import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { readConfigReferences } from '../src/helpers/config-references';
import { runOnReferences } from '../src/helpers/references-resolver';
import { Output } from '../src/utils';

const testDir = join(__dirname, '../temp-test-references');

beforeAll(() => {
  if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
  mkdirSync(testDir, { recursive: true });
});

afterAll(() => {
  if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
});

describe('readConfigReferences', () => {
  const output = new Output(false, false);

  it('should return empty array when tsconfig has no references', () => {
    const tsconfigPath = join(testDir, 'tsconfig.no-ref.json');
    writeFileSync(tsconfigPath, JSON.stringify({ compilerOptions: {} }));

    const refs = readConfigReferences({ configFile: tsconfigPath, output });
    expect(refs).toEqual([]);
  });

  it('should resolve folder-based and file-based references', () => {
    const subProjectDir = join(testDir, 'sub-pkg');
    mkdirSync(subProjectDir, { recursive: true });
    const subTsconfigPath = join(subProjectDir, 'tsconfig.json');
    writeFileSync(subTsconfigPath, JSON.stringify({ compilerOptions: {} }));

    const rootTsconfigPath = join(testDir, 'tsconfig.root.json');
    writeFileSync(
      rootTsconfigPath,
      JSON.stringify({
        references: [{ path: './sub-pkg' }]
      })
    );

    const refs = readConfigReferences({ configFile: rootTsconfigPath, output });
    expect(refs).toEqual([subTsconfigPath]);
  });

  it('should skip non-existing referenced paths', () => {
    const rootTsconfigPath = join(testDir, 'tsconfig.missing.json');
    writeFileSync(
      rootTsconfigPath,
      JSON.stringify({
        references: [{ path: './non-existent-sub-pkg' }]
      })
    );

    const refs = readConfigReferences({ configFile: rootTsconfigPath, output });
    expect(refs).toEqual([]);
  });
});

describe('runOnReferences cycle protection', () => {
  const output = new Output(false, false);

  it('should not enter infinite recursion when circular references exist', async () => {
    const dirA = join(testDir, 'circular-a');
    const dirB = join(testDir, 'circular-b');
    mkdirSync(dirA, { recursive: true });
    mkdirSync(dirB, { recursive: true });

    const tsconfigA = join(dirA, 'tsconfig.json');
    const tsconfigB = join(dirB, 'tsconfig.json');

    // A references B, B references A
    writeFileSync(
      tsconfigA,
      JSON.stringify({
        compilerOptions: { outDir: './dist' },
        references: [{ path: '../circular-b' }]
      })
    );
    writeFileSync(
      tsconfigB,
      JSON.stringify({
        compilerOptions: { outDir: './dist' },
        references: [{ path: '../circular-a' }]
      })
    );

    const visited = new Set<string>([tsconfigA]);

    // Should complete without throwing or exceeding stack
    await expect(
      runOnReferences({
        configFile: tsconfigA,
        options: { followReferences: true },
        output,
        visited
      })
    ).resolves.not.toThrow();

    expect(visited.has(tsconfigA)).toBe(true);
    expect(visited.has(tsconfigB)).toBe(true);
  });
});

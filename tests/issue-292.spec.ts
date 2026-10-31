import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { prepareSingleFileReplaceTscAliasPaths, replaceTscAliasPaths } from '../src';

describe('issue 292: preserve bare package subpaths for bundlers', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(__dirname, 'temp-issue-292-'));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  function write(path: string, content: string): void {
    const filename = join(projectDir, path);
    mkdirSync(dirname(filename), { recursive: true });
    writeFileSync(filename, content);
  }

  function configure(moduleResolution: string): void {
    write('tsconfig.base.json', JSON.stringify({ compilerOptions: { moduleResolution } }));
    write(
      'tsconfig.json',
      JSON.stringify({
        extends: './tsconfig.base.json',
        compilerOptions: { baseUrl: '.', module: 'esnext', outDir: 'dist', paths: { '@/*': ['./dist/*'] } },
        include: ['dist/**/*.js'],
        exclude: ['node_modules']
      })
    );
    write('node_modules/next/package.json', JSON.stringify({ name: 'next', version: '1.0.0' }));
    write('node_modules/next/font/google/index.js', '');
    write('node_modules/next/navigation.js', '');
    write('dist/local.js', 'export const local = 1;');
  }

  const code =
    "import { font } from 'next/font/google';\nimport { nav } from 'next/navigation';\nimport { local } from '@/local';\nimport './local';\n";
  const expected =
    "import { font } from 'next/font/google';\nimport { nav } from 'next/navigation';\nimport { local } from './local.js';\nimport './local.js';\n";

  it('preserves package imports while completing relative and alias imports', async () => {
    configure('bundler');
    write('dist/index.js', code);
    await replaceTscAliasPaths({ configFile: join(projectDir, 'tsconfig.json'), resolveFullPaths: true });
    expect(readFileSync(join(projectDir, 'dist/index.js'), 'utf8')).toBe(expected);
  });

  it('preserves package imports in the single-file API', async () => {
    configure('Bundler');
    const replace = await prepareSingleFileReplaceTscAliasPaths({
      configFile: join(projectDir, 'tsconfig.json'),
      resolveFullPaths: true
    });
    expect(replace({ fileContents: code, filePath: join(projectDir, 'dist/index.js') })).toBe(expected);
  });
});

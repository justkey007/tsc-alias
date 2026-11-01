import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { replaceTscAliasPaths } from '../src';

describe('issue 256: resolveFullPaths for package subpath imports', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'temp-issue-256-'));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  function write(path: string, content: string): void {
    const filename = join(projectDir, path);
    mkdirSync(dirname(filename), { recursive: true });
    writeFileSync(filename, content);
  }

  it('adds extensions to bare package file and directory subpaths', async () => {
    write(
      'tsconfig.json',
      JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          module: 'es2022',
          moduleResolution: 'node',
          outDir: 'dist'
        },
        include: ['dist/**/*.js']
      })
    );
    write('dist/imports.js', "import { file } from 'package/file';\nimport { directory } from 'package/subpath';\n");
    write('node_modules/package/file.js', 'export const file = 1;');
    write('node_modules/package/subpath/index.js', 'export const directory = 1;');

    await replaceTscAliasPaths({ configFile: join(projectDir, 'tsconfig.json'), resolveFullPaths: true });

    expect(readFileSync(join(projectDir, 'dist/imports.js'), 'utf8')).toBe(
      "import { file } from 'package/file.js';\nimport { directory } from 'package/subpath/index.js';\n"
    );
  });

  it('resolves scoped subpaths from a nested node_modules directory', async () => {
    write(
      'tsconfig.json',
      JSON.stringify({
        compilerOptions: { outDir: 'dist' },
        include: ['dist/**/*.js']
      })
    );
    write('dist/nested/imports.js', "import { value } from '@scope/package/lib/value';\n");
    write('dist/nested/node_modules/@scope/package/lib/value.mjs', 'export const value = 1;');

    await replaceTscAliasPaths({
      configFile: join(projectDir, 'tsconfig.json'),
      resolveFullPaths: true,
      resolveFullExtension: '.mjs'
    });

    expect(readFileSync(join(projectDir, 'dist/nested/imports.js'), 'utf8')).toBe(
      "import { value } from '@scope/package/lib/value.mjs';\n"
    );
  });
});

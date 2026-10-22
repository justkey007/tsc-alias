import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { replaceTscAliasPaths } from '../src';

describe('issue 290: respect package exports for bare package subpaths', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(__dirname, 'temp-issue-290-'));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  function write(path: string, content: string): void {
    const filename = join(projectDir, path);
    mkdirSync(dirname(filename), { recursive: true });
    writeFileSync(filename, content);
  }

  async function replaceImports(code: string): Promise<string> {
    write('dist/index.js', code);
    await replaceTscAliasPaths({ configFile: join(projectDir, 'tsconfig.json'), resolveFullPaths: true });
    return readFileSync(join(projectDir, 'dist/index.js'), 'utf8');
  }

  function configure(): void {
    write(
      'tsconfig.json',
      JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          module: 'esnext',
          moduleResolution: 'bundler',
          outDir: 'dist'
        },
        include: ['dist/**/*.js'],
        exclude: ['node_modules']
      })
    );
    write(
      'node_modules/some-lib/package.json',
      JSON.stringify({
        name: 'some-lib',
        version: '1.0.0',
        type: 'module',
        exports: {
          './jsx-runtime': './jsx-runtime.js'
        }
      })
    );
    write('node_modules/some-lib/jsx-runtime.js', 'export const jsx = () => {};\n');
  }

  beforeEach(() => {
    configure();
  });

  it('leaves React-style jsx-runtime subpaths unchanged when the suffixed file exists', async () => {
    const code = "import { jsx } from 'some-lib/jsx-runtime';\n";

    expect(await replaceImports(code)).toBe(code);
  });

  it('preserves bare imports without a package subpath', async () => {
    const code = "import React from 'some-lib';\n";

    expect(await replaceImports(code)).toBe(code);
  });
});

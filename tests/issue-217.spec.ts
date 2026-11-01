import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import * as shell from 'shelljs';
import { replaceTscAliasPaths } from '../src';

describe('issue 217: aliases targeting the project root', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'temp-issue-217-'));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  function write(path: string, content: string): void {
    const filename = join(projectDir, path);
    mkdirSync(dirname(filename), { recursive: true });
    writeFileSync(filename, content);
  }

  it('rewrites a root-directory wildcard alias from TypeScript output', async () => {
    write(
      'tsconfig.json',
      JSON.stringify({
        compilerOptions: {
          target: 'esnext',
          module: 'esnext',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          isolatedModules: true,
          forceConsistentCasingInFileNames: true,
          moduleResolution: 'node',
          baseUrl: '.',
          outDir: './build',
          paths: { '#/*': ['./*'] }
        },
        'tsc-alias': {
          resolveFullPaths: true,
          verbose: false
        },
        exclude: ['node_modules', 'build']
      })
    );
    write('main.ts', "import { value } from '#/utils';\nexport const result = value;\n");
    write('utils.ts', 'export const value = 42;\n');

    const tscPath = join(__dirname, '../node_modules/.bin/tsc');
    const { code, stdout, stderr } = shell.exec(tscPath, { cwd: projectDir, silent: true });
    expect({ code, stdout, stderr }).toEqual({ code: 0, stdout: '', stderr: '' });

    await replaceTscAliasPaths({ configFile: join(projectDir, 'tsconfig.json') });

    expect(readFileSync(join(projectDir, 'build/main.js'), 'utf8')).toBe(
      "import { value } from './utils.js';\nexport const result = value;\n"
    );
  });
});

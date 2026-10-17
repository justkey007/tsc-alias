import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import * as shell from 'shelljs';
import { replaceTscAliasPaths } from '../src';

describe('issue 198: aliases in JavaScript files with allowJs', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(__dirname, 'temp-issue-198-'));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  function write(path: string, content: string): void {
    const filename = join(projectDir, path);
    mkdirSync(dirname(filename), { recursive: true });
    writeFileSync(filename, content);
  }

  it('rewrites aliased require calls emitted from JavaScript source files', async () => {
    write(
      'tsconfig.json',
      JSON.stringify({
        compilerOptions: {
          allowJs: true,
          checkJs: false,
          target: 'esnext',
          module: 'commonjs',
          baseUrl: '.',
          outDir: './build',
          paths: { '@utils/*': ['./src/utils/*'] }
        },
        include: ['src/**/*.js'],
        exclude: ['node_modules', 'build']
      })
    );
    write('src/main.js', "const { value } = require('@utils/helper');\nmodule.exports = value;\n");
    write('src/utils/helper.js', 'exports.value = 42;\n');

    const tscPath = join(__dirname, '../node_modules/.bin/tsc');
    const { code, stdout, stderr } = shell.exec(tscPath, { cwd: projectDir, silent: true });
    expect({ code, stdout, stderr }).toEqual({ code: 0, stdout: '', stderr: '' });
    expect(readFileSync(join(projectDir, 'build/main.js'), 'utf8')).toContain("require('@utils/helper')");

    await replaceTscAliasPaths({ configFile: join(projectDir, 'tsconfig.json') });

    expect(readFileSync(join(projectDir, 'build/main.js'), 'utf8')).toContain("require('./utils/helper.js')");
  });
});

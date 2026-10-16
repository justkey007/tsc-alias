import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { replaceTscAliasPaths } from '../src';

describe('aliases to existing build artifacts', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(__dirname, 'temp-built-alias-'));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  function write(path: string, content: string): void {
    const filename = join(projectDir, path);
    mkdirSync(dirname(filename), { recursive: true });
    writeFileSync(filename, content);
  }

  function configure(paths: Record<string, string[]>, outputCheck?: string[]): void {
    // These tests exercise emitted JavaScript, without a consumer compiler dependency.
    write(
      'tsconfig.json',
      JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          paths,
          module: 'es2022',
          moduleResolution: 'node',
          outDir: '.'
        },
        include: ['test/**/*.ts'],
        exclude: ['node_modules'],
        'tsc-alias': { resolveFullPaths: true, fileExtensions: { outputCheck } }
      })
    );
    write(
      'tsconfig.test.json',
      JSON.stringify({
        extends: './tsconfig.json',
        compilerOptions: { outDir: './test' },
        include: ['test/**/*.ts']
      })
    );
  }

  async function replace(code: string): Promise<string> {
    write('test/imports.js', code);
    await replaceTscAliasPaths({ configFile: join(projectDir, 'tsconfig.test.json') });
    return readFileSync(join(projectDir, 'test/imports.js'), 'utf8');
  }

  function valueImport(moduleName: string): string {
    return `import { json } from '${moduleName}';\nexport const observed = json;\n`;
  }

  it('resolves an existing directory target outside an inherited output directory', async () => {
    configure({ '@uchihayuki/node-common': ['./dist'] });
    write('dist/index.js', 'export const json = 1;');
    write('dist/index.d.ts', 'export declare const json: number;');

    const result = await replace(valueImport('@uchihayuki/node-common'));

    expect(result).toBe(valueImport('../dist/index.js'));
    expect(resolve(projectDir, 'test', result.split("'")[1])).toBe(join(projectDir, 'dist/index.js'));
  });

  it('prefers the current output over an existing artifact for the same candidate', async () => {
    configure({ '@package': ['./dist'] });
    write('dist/index.js', 'export const json = "old";');
    write('dist/index.d.ts', 'export declare const json: string;');
    write('test/dist/index.js', 'export const json = "current";');

    expect(await replace(valueImport('@package'))).toBe(valueImport('./dist/index.js'));
  });

  it('keeps candidate order when an earlier artifact precedes a later output', async () => {
    configure({ '@package': ['./first', './second'] });
    write('first/index.js', 'export const json = 1;');
    write('test/second/index.js', 'export const json = 2;');

    expect(await replace(valueImport('@package'))).toBe(valueImport('../first/index.js'));
  });

  it('checks each concrete wildcard target independently', async () => {
    configure({ '@package/*': ['./built/*'] });
    write('test/built/a.js', 'export const a = 1;');
    write('built/b.js', 'export const b = 2;');
    const code = "import { a } from '@package/a';\nimport { b } from '@package/b';\nexport const observed = [a, b];\n";

    expect(await replace(code)).toBe(
      "import { a } from './built/a.js';\nimport { b } from '../built/b.js';\nexport const observed = [a, b];\n"
    );
  });

  it('leaves aliases without a runtime file unchanged', async () => {
    configure({
      '@empty': ['./empty'],
      '@declarations': ['./declarations'],
      '@directory': ['./directory.js'],
      '@source/*': ['./source/*']
    });
    mkdirSync(join(projectDir, 'empty'));
    mkdirSync(join(projectDir, 'directory.js'));
    write('declarations/index.d.ts', 'export declare const json: number;');
    write('source/value.ts', 'export const json = 1;');
    const code = [
      "import { json as empty } from '@empty';",
      "import { json as declarations } from '@declarations';",
      "import { json as directory } from '@directory';",
      "import { json as source } from '@source/value.ts';",
      'export const observed = [empty, declarations, directory, source];',
      ''
    ].join('\n');

    expect(await replace(code)).toBe(code);
  });

  it('uses the configured output extensions for existing artifacts', async () => {
    configure({ '@package': ['./runtime'] }, ['cjs']);
    write('runtime/index.js', 'exports.json = "unconfigured";');
    write('runtime/index.cjs', 'exports.json = "configured";');

    expect(await replace(valueImport('@package'))).toBe(valueImport('../runtime/index.cjs'));
  });

  it('preserves the dedicated node_modules resolution', async () => {
    configure({ '@package': ['node_modules/local-package'] });
    write('node_modules/local-package/index.js', 'export const json = 1;');

    const cwd = process.cwd();
    try {
      process.chdir(projectDir);
      expect(await replace(valueImport('@package'))).toBe(valueImport('../node_modules/local-package/index.js'));
    } finally {
      process.chdir(cwd);
    }
  });
});

import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { replaceTscAliasPaths } from '../src';

describe('Issue #300: catch-all paths entry must not rewrite relative imports', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'tsc-alias-issue-300-'));
    mkdirSync(join(projectDir, 'dist/constants'), { recursive: true });
    mkdirSync(join(projectDir, 'dist/types'), { recursive: true });
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('leaves relative require("../types/b.cjs.js") untouched with catch-all "*" paths', async () => {
    writeFileSync(
      join(projectDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          outDir: 'dist',
          baseUrl: '.',
          paths: {
            '*': ['types/*']
          }
        }
      })
    );

    const sourceFile = join(projectDir, 'dist/constants/a.cjs.js');
    writeFileSync(sourceFile, "var b = require('../types/b.cjs.js');\n");
    writeFileSync(join(projectDir, 'dist/types/b.cjs.js'), 'exports.b = 1;\n');
    writeFileSync(join(projectDir, 'dist/types/b.d.ts'), 'export declare const b: number;\n');

    await replaceTscAliasPaths({
      configFile: join(projectDir, 'tsconfig.json')
    });

    expect(readFileSync(sourceFile, 'utf8')).toBe("var b = require('../types/b.cjs.js');\n");
  });

  it('still resolves non-relative imports matched by catch-all "*" paths', async () => {
    writeFileSync(
      join(projectDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          outDir: 'dist',
          baseUrl: '.',
          paths: {
            '*': ['types/*']
          }
        }
      })
    );

    const sourceFile = join(projectDir, 'dist/constants/a.js');
    writeFileSync(sourceFile, "var b = require('b');\n");
    writeFileSync(join(projectDir, 'dist/types/b.js'), 'exports.b = 1;\n');

    await replaceTscAliasPaths({
      configFile: join(projectDir, 'tsconfig.json')
    });

    expect(readFileSync(sourceFile, 'utf8')).toBe("var b = require('../types/b.js');\n");
  });

  it('handles aliased import to double-extension file when b.d.ts also exists', async () => {
    writeFileSync(
      join(projectDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          outDir: 'dist',
          baseUrl: '.',
          paths: {
            '@/*': ['types/*']
          }
        }
      })
    );

    const sourceFile = join(projectDir, 'dist/constants/a.js');
    writeFileSync(sourceFile, "var b = require('@/b.cjs.js');\n");
    writeFileSync(join(projectDir, 'dist/types/b.cjs.js'), 'exports.b = 1;\n');
    writeFileSync(join(projectDir, 'dist/types/b.d.ts'), 'export declare const b: number;\n');

    await replaceTscAliasPaths({
      configFile: join(projectDir, 'tsconfig.json')
    });

    expect(readFileSync(sourceFile, 'utf8')).toBe("var b = require('../types/b.cjs.js');\n");
  });
});

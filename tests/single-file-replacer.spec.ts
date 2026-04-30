import { readFileSync } from 'fs';
import { sync } from 'globby';
import { join, normalize } from 'path';
import * as rimraf from 'rimraf';
import * as shell from 'shelljs';
import {
  ReplaceTscAliasPathsOptions,
  prepareSingleFileReplaceTscAliasPaths,
  replaceTscAliasPaths
} from '../src';

const projectsRoot = join(__dirname, '../projects');

it('prepareSingleFileReplaceTscAliasPaths() works', async () => {
  const projectDir = join(projectsRoot, `project19`);
  const outPath = join(projectDir, 'dist');
  const basePath = join(projectDir, 'dist-base');

  rimraf.sync(outPath);
  rimraf.sync(basePath);

  const runTask = (task: string) => {
    shell.exec(task, {
      cwd: projectDir,
      silent: true
    });
  };

  // Compile TypeScript only (no tsc-alias CLI dependency)
  runTask('npm run build:tsc-base'); // tsc --outDir dist-base
  runTask('tsc'); // tsc → dist/ per tsconfig outDir

  const options: ReplaceTscAliasPathsOptions = {
    configFile: join(projectDir, 'tsconfig.json'),
    resolveFullPaths: true
  };

  // Apply alias replacement via JS API instead of CLI to avoid PATH/version differences
  await replaceTscAliasPaths(options);

  const runFile = await prepareSingleFileReplaceTscAliasPaths(options);

  // Finding files and changing alias paths
  const posixOutput = basePath.replace(/\\/g, '/');
  const globPattern = [
    `${posixOutput}/**/*.{mjs,cjs,js,jsx,d.{mts,cts,ts,tsx}}`,
    `!${posixOutput}/**/node_modules`
  ];
  const files = sync(globPattern, {
    dot: true,
    onlyFiles: true
  });

  expect(files.length).toBeGreaterThan(0);

  files.map((filePath) => {
    const altFilePath = normalize(filePath.replace(posixOutput, outPath));
    const fileContents = readFileSync(filePath, 'utf8');
    const expectedContents = readFileSync(altFilePath, 'utf8');
    const newContents = runFile({ fileContents, filePath });
    expect(newContents).toEqual(expectedContents);
  });

  expect.assertions(files.length + 1);
}, 120000);

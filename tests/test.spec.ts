import { join } from 'path';
import * as rimraf from 'rimraf';
import * as shell from 'shelljs';
import { newImportStatementRegex, newStringRegex } from '../src/utils';
import { sync } from 'globby';
import {
  ReplaceTscAliasPathsOptions,
  prepareSingleFileReplaceTscAliasPaths
} from '../src';
import { readFileSync } from 'fs';

const projectsRoot = join(__dirname, '../projects');

/**
 * Sample JavaScript code with a bunch of require/import
 * statements with various spacing etc. Import paths from
 * valid statements are incrementing numbers, starting from 0,
 * so that it is easy to verify validity of results.
 */
const sampleImportStatements = `
const module = require('0')
var module = require
(
  '1'
)  ;
import module from '2';
import "3"

imported ("invalid/import")

import theDefault, {namedExport} from
    "4"
import {
  extraLinesOhNo
} from '5'
const asyncImport = await import('6');

export * from '7';

import

  '8'

const notAnImport = unimport('something');
`;

function runTestProject(projectNumber: number) {
  const projectDir = join(projectsRoot, `project${projectNumber}`);
  rimraf.sync(join(projectDir, 'dist'));
  const { code, stderr } = shell.exec('npm start', {
    cwd: projectDir
  });
  if (code !== 0) console.error(stderr);
  expect(code).toEqual(0);
}

it(`Import regex matches import statements`, () => {
  const expectedImportPaths = sampleImportStatements.match(
    /(\d+)/g
  ) as string[];

  const importStatementMatches = sampleImportStatements.match(
    newImportStatementRegex('g')
  );
  expect(importStatementMatches).toHaveLength(expectedImportPaths.length);

  const foundImportPaths: string[] = [];
  for (const importStatement of importStatementMatches) {
    // Global match is a string, not a match group, so re-match without the global flag.
    const pathMatch = importStatement.match(newStringRegex());
    expect(pathMatch).toBeTruthy();
    foundImportPaths.push(pathMatch.groups.path);
  }
  expectedImportPaths.forEach((expectedPath, i) => {
    expect(expectedPath).toEqual(foundImportPaths[i]);
  });
});

it(`Import regex does not match edge cases from keywords in strings`, function () {
  const testCase = `
    'a string with keyword from '
    // The from keyword in that string can cause
    // a match up to the next quote, since the regex does not
    // know that the keyword is in a string context
    'another string using same quote type'
  `;
  expect(newImportStatementRegex().exec(testCase)?.[0]).toBeUndefined();
});

// Run tests on projects. 9-11 are for testing fullpath file resolution
[1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].forEach(
  (value) => {
    it(`Project ${value} runs after alias resolution`, () => {
      runTestProject(value);
    });
  }
);

it('prepareSingleFileReplaceTscAliasPaths() works', async () => {
  const projectDir = join(projectsRoot, `project19`);
  const outPath = join(projectDir, 'dist');
  const basePath = join(projectDir, 'dist-base');

  rimraf.sync(outPath);
  rimraf.sync(basePath);

  const runTask = (task: string) => {
    shell.exec(task, {
      cwd: projectDir
    });
  };

  runTask('npm run build');
  runTask('npm run build:tsc-base');

  const options: ReplaceTscAliasPathsOptions = {
    configFile: join(projectDir, 'tsconfig.json'),
    resolveFullPaths: true
  };

  const runFile = await prepareSingleFileReplaceTscAliasPaths(options);

  // Finding files and changing alias paths
  const globPattern = [
    `${basePath}/**/*.{mjs,cjs,js,jsx,d.{mts,cts,ts,tsx}}`,
    `!${basePath}/**/node_modules`
  ];
  const files = sync(globPattern, {
    dot: true,
    onlyFiles: true
  });

  expect(files.length).toBeGreaterThan(0);

  files.map((filePath) => {
    const altFilePath = filePath.replace(basePath, outPath);
    const fileContents = readFileSync(filePath, 'utf8');
    const expectedContents = readFileSync(altFilePath, 'utf8');
    const newContents = runFile({ fileContents, filePath });
    expect(newContents).toEqual(expectedContents);
  });

  expect.assertions(files.length + 1);
});

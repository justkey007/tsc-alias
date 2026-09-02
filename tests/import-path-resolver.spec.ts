import { newImportStatementRegex, newStringRegex } from '../src/utils';

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

it(`Import regex matches import statements`, () => {
  const expectedImportPaths = sampleImportStatements.match(/(\d+)/g) as string[];

  const importStatementMatches = sampleImportStatements.match(newImportStatementRegex('g')) as RegExpMatchArray;
  expect(importStatementMatches).toHaveLength(expectedImportPaths.length);

  const foundImportPaths: string[] = [];
  for (const importStatement of importStatementMatches) {
    // Global match is a string, not a match group, so re-match without the global flag.
    const pathMatch = importStatement.match(newStringRegex()) as RegExpMatchArray;
    expect(pathMatch).toBeTruthy();
    if (pathMatch.groups) foundImportPaths.push(pathMatch.groups.path);
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

it(`Should correctly extract ONLY the file path even with JSON attributes`, function () {
  const statement = `await import('@app/data.json', { with: { type: 'json' } });`;
  const match = statement.match(newStringRegex());
  expect(match?.groups?.path).toBe('@app/data.json');
});

it(`Import regex matches dynamic import with options/attributes`, function () {
  const statement = `const { default: data } = await import('@app/data.json', { with: { type: 'json' } });`;
  const matches = statement.match(newImportStatementRegex('g'));
  expect(matches).toBeTruthy();
  expect(matches?.[0]).toBe(`import('@app/data.json', { with: { type: 'json' } })`);
});

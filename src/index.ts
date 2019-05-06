#! /usr/bin/env node

// tslint:disable no-console
import * as program from 'commander';
import { readFileSync, writeFileSync } from 'fs';
import { sync } from 'globby';
import * as normalizePath from 'normalize-path';
import { basename, dirname, normalize, relative, resolve } from 'path';
import { getPathThatEndsUp, loadConfig, walk } from './util';

program
  .version('0.0.1')
  .option('-p, --project <file>', 'path to tsconfig.json')

program.on('--help', () => {
  console.log(`
  $ tscpath -p tsconfig.json
`);
});

program.parse(process.argv);

const { project } = program as {
  project?: string;
};
if (!project) {
  throw new Error('--project must be specified');
}

console.log("***tsc-alias starting***");

// console.log = () => { };
const configFile = resolve(process.cwd(), project);
// console.log(`tsconfig.json: ${configFile}`);

const { baseUrl, outDir, paths } = loadConfig(configFile);

if (!baseUrl) {
  throw new Error('compilerOptions.baseUrl is not set');
}
if (!paths) {
  throw new Error('compilerOptions.paths is not set');
}
if (!outDir) {
  throw new Error('compilerOptions.outDir is not set');
}
// console.log(`baseUrl: ${baseUrl}`);
// console.log(`outDir: ${outDir}`);
// console.log(`paths: ${JSON.stringify(paths, null, 2)}`);

const configDir: string = normalizePath(dirname(configFile));
const confDirParentFolderName: string = basename(configDir);

const basePath = normalizePath(
  getPathThatEndsUp(
    walk(
      normalizePath(normalize(`${configDir}/${outDir}`)),
      confDirParentFolderName), confDirParentFolderName
  )
);
// console.log(`basePath: ${basePath}`);

const outPath = normalizePath(configDir + '/' + outDir);
// console.log(`outPath: ${outPath}`);

const aliases = Object.keys(paths)
  .map((alias) => ({
    prefix: alias.replace(/\*$/, ''),
    paths: paths[alias as keyof typeof paths].map((p) =>
      p.replace(/\*$/, '')
        .replace('ts', 'js')
    ),
  }))
  .filter(({ prefix }) => prefix);
// console.log(`aliases: ${JSON.stringify(aliases, null, 2)}`);

const requireRegex = /(?:import|require)\(['"]([^'"]*)['"]\)/g;
const importRegex = /(?:import|from) ['"]([^'"]*)['"]/g;

const replaceImportStatement = (
  orig: string,
  file: string,
  aliasPrefix: string,
  aliasPath: string
): string => {
  const requiredModule = orig.split(/"|'/)[1];
  const index = orig.indexOf(aliasPrefix);
  const isAlias = requiredModule === aliasPrefix
  if (index > -1 && isAlias) {
    const absoluteAliasPath = normalizePath(`${basePath}/${aliasPath}`);
    const relativeAliasPath = normalizePath(relative(dirname(file), absoluteAliasPath));

    const modulePath = orig.substring(0, index) +
      relativeAliasPath +
      orig.substring(index + aliasPrefix.length);
    return modulePath;
  }
  return orig;
};

const replaceAlias = (text: string, file: string): string => {
  for (const alias of aliases) {
    text = text
      .replace(requireRegex, (orig) =>
        replaceImportStatement(orig, file, alias.prefix, alias.paths[0])
      )
      .replace(importRegex, (orig) =>
        replaceImportStatement(orig, file, alias.prefix, alias.paths[0])
      );
  }
  return text;
}

// import relative to absolute path
const files = sync(`${outPath}/**/*.{js,jsx,ts,tsx}`, {
  dot: true,
  noDir: true,
} as any).map((x) => resolve(x));

const flen = files.length;
for (let i = 0; i < flen; i += 1) {
  const file = files[i];
  const text = readFileSync(file, 'utf8');
  const newText = replaceAlias(text, file);
  if (text !== newText) {
    writeFileSync(file, newText, 'utf8');
  }
}

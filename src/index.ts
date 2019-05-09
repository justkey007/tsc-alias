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
  .option('-p, --project <file>', 'path to tsconfig.json');

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

console.log('***tsc-alias starting***');

console.log = () => {};

const configFile = resolve(process.cwd(), project);
console.log(`tsconfig.json: ${configFile}`);

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
console.log(`baseUrl: ${baseUrl}`);
console.log(`outDir: ${outDir}`);
console.log(`paths: ${JSON.stringify(paths, null, 2)}`);

const configDir: string = normalizePath(dirname(configFile));
console.log('configDir', configDir);

const outPath = normalizePath(configDir + '/' + outDir);
console.log(`outPath: ${outPath}`);

const confDirParentFolderName: string = basename(configDir);

let hasExtraModule = false;
let configDirInOutPath: string = null;

const aliases = Object.keys(paths)
  .map((alias) => {
    const _paths = paths[alias as keyof typeof paths].map((path) =>
      path.replace(/\*$/, '').replace('ts', 'js')
    );

    let isExtra = false;
    let basePath;
    if (normalize(_paths[0]).includes('..')) {
      hasExtraModule = true;
      isExtra = true;
      basePath = normalizePath(
        getPathThatEndsUp(
          walk(
            normalizePath(normalize(`${configDir}/${baseUrl}/${outDir}`)),
            confDirParentFolderName
          ),
          confDirParentFolderName
        )
      );
      if (!configDirInOutPath) {
        configDirInOutPath = basePath;
      }
    } else {
      basePath = normalizePath(normalize(`${configDir}/${baseUrl}/${outDir}`));
    }
    return {
      prefix: alias.replace(/\*$/, ''),
      basePath,
      paths: _paths,
      isExtra,
    };
  })
  .filter(({ prefix }) => prefix);
console.log(`aliases: ${JSON.stringify(aliases, null, 2)}`);

// Find relative path access of configDir in outPath
let relConfDirPathInOutPath;
if (configDirInOutPath) {
  const stepsbackPath = relative(configDirInOutPath, outPath);
  const splitStepBackPath = normalizePath(stepsbackPath).split('/');
  const nbOfStepBack = splitStepBackPath.length;
  const splitConfDirInOutPath = configDirInOutPath.split('/');

  let i = 1;
  const splitRelPath: string[] = [];
  while (i <= nbOfStepBack) {
    splitRelPath.unshift(
      splitConfDirInOutPath[splitConfDirInOutPath.length - i]
    );
    i++;
  }
  relConfDirPathInOutPath = splitRelPath.join('/');
  console.log('===>relParentPath', relConfDirPathInOutPath);
}

const requireRegex = /(?:import|require)\(['"]([^'"]*)['"]\)/g;
const importRegex = /(?:import|from) ['"]([^'"]*)['"]/g;

const replaceImportStatement = ({
  orig,
  file,
  alias,
}: {
  orig: string;
  file: string;
  alias: typeof aliases[0];
}): string => {
  const requiredModule = orig.split(/"|'/)[1];
  const index = orig.indexOf(alias.prefix);
  const isAlias = requiredModule === alias.prefix;
  if (index > -1 && isAlias) {
    let absoluteAliasPath;
    absoluteAliasPath = normalizePath(
      normalize(
        `${alias.basePath}/${
          hasExtraModule && !alias.isExtra ? relConfDirPathInOutPath + '/' : ''
        }${alias.paths[0]}`
      )
    );

    // console.log('abs', absoluteAliasPath);
    // console.log('fileDirName', dirname(file));

    let relativeAliasPath = normalizePath(
      relative(dirname(file), absoluteAliasPath)
    );
    // console.log('rel', relativeAliasPath + '\n');

    if (relativeAliasPath[0] !== '.') {
      relativeAliasPath = './' + relativeAliasPath;
    }

    const modulePath =
      orig.substring(0, index) +
      relativeAliasPath +
      orig.substring(index + alias.prefix.length);
    return modulePath;
  }
  return orig;
};

const replaceAlias = (text: string, file: string): string => {
  for (const alias of aliases) {
    const replacementParams = {
      file,
      alias,
    };
    text = text
      .replace(requireRegex, (orig) =>
        replaceImportStatement({
          orig,
          ...replacementParams,
        })
      )
      .replace(importRegex, (orig) =>
        replaceImportStatement({
          orig,
          ...replacementParams,
        })
      );
  }
  return text;
};

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

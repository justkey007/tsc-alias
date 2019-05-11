#! /usr/bin/env node

// tslint:disable no-console
import * as program from 'commander';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { sync } from 'globby';
import * as normalizePath from 'normalize-path';
import { basename, dirname, normalize, relative, resolve } from 'path';
import { getPathThatEndsUp, loadConfig, walk } from './util';

program
  .version('1.0.2')
  .option('-p, --project <file>', 'path to tsconfig.json');

program.on('--help', () => {
  console.log(`
  $ tscpath
  $ tscpath -p tsconfig.json
`);
});

program.parse(process.argv);

const { project } = program as {
  project?: string;
};

// console.log = () => {};
console.info('***tsc-alias starting***');

const configFile = resolve(process.cwd(), project ? project : 'tsconfig.json');

if (!existsSync(configFile)) {
  throw new Error(
    'No valid tsconfig.json file. Specify one by tsc-alias -p tsconfig.json!'
  );
}
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
let relConfDirPathInOutPath;

const aliases = Object.keys(paths)
  .map((alias) => {
    const _paths = paths[alias as keyof typeof paths].map((path) =>
      path.replace(/\*$/, '').replace('ts', 'js')
    );

    const path = _paths[0];

    const isExtra = null;
    const basePath = null;
    if (normalize(path).includes('..')) {
      const dirs =
        walk(
          normalizePath(normalize(`${configDir}/${outDir}`)),
          confDirParentFolderName
        ) || [];

      let outOfProject = false;
      let i = 0;
      while (i < dirs.length && !outOfProject) {
        const dir = dirs[i];
        const indexOfOutFolder = dir.indexOf(normalizePath(outDir));
        if (dir.lastIndexOf(confDirParentFolderName) > indexOfOutFolder) {
          outOfProject = true;
        }
        i++;
      }

      if (outOfProject && !configDirInOutPath) {
        configDirInOutPath = normalizePath(
          getPathThatEndsUp(dirs, confDirParentFolderName)
        );
        hasExtraModule = true;

        // Find relative path access of configDir in outPath
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
      }
    }

    let prefix = alias.replace(/\*$/, '');
    if (prefix[prefix.length - 1] === '/') {
      prefix = prefix.substring(0, prefix.length - 1);
    }
    return {
      prefix,
      basePath,
      path,
      paths: _paths,
      isExtra,
    };
  })
  .filter(({ prefix }) => prefix);

/*********** Find basepath of aliases *****************/
aliases.forEach((alias) => {
  if (normalize(alias.path).includes('..')) {
    const tempBasePath = normalizePath(
      normalize(
        `${configDir}/${outDir}/${
          hasExtraModule && relConfDirPathInOutPath
            ? relConfDirPathInOutPath
            : ''
        }/${baseUrl}`
      )
    );
    if (existsSync(`tempBasePath/${alias.path}`)) {
      alias.isExtra = false;
      alias.basePath = tempBasePath;
    } else {
      alias.isExtra = true;
      alias.basePath = normalizePath(
        normalize(`${tempBasePath}/${alias.path}`)
      );
    }
  } else if (hasExtraModule) {
    alias.isExtra = false;
    alias.basePath = normalizePath(
      normalize(`${configDir}/${outDir}/${relConfDirPathInOutPath}/${baseUrl}`)
    );
  } else {
    alias.basePath = normalizePath(normalize(`${configDir}/${outDir}`));
    alias.isExtra = false;
  }
});
console.log(`aliases: ${JSON.stringify(aliases, null, 2)}`);

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
  const isAlias = requiredModule.indexOf(alias.prefix) === 0;
  if (index > -1 && isAlias) {
    let absoluteAliasPath;
    absoluteAliasPath = normalizePath(
      normalize(`${alias.basePath}/${alias.path}`)
    );

    console.log('abs', absoluteAliasPath);
    console.log('fileDirName', dirname(file));

    let relativeAliasPath = normalizePath(
      relative(dirname(file), absoluteAliasPath)
    );
    console.log('rel', relativeAliasPath + '\n');

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
let replaceCount = 0;
for (let i = 0; i < flen; i += 1) {
  const file = files[i];
  const text = readFileSync(file, 'utf8');
  const newText = replaceAlias(text, file);
  if (text !== newText) {
    replaceCount++;
    writeFileSync(file, newText, 'utf8');
  }
}

console.info(`${replaceCount} files have been replaced!`);

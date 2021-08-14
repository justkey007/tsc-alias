import { watch } from 'chokidar';
import { existsSync, promises as fsp } from 'fs';
import { sync } from 'globby';
import * as normalizePath from 'normalize-path';
import {
  basename,
  dirname,
  isAbsolute,
  normalize,
  relative,
  resolve
} from 'path';
import {
  existsResolvedAlias,
  getAbsoluteAliasPath,
  getProjectDirPathInOutDir,
  loadConfig
} from './helpers';
import {
  newStringRegex,
  Output,
  replaceSourceImportPaths,
  resolveFullImportPaths
} from './utils';

export interface ReplaceTscAliasPathsOptions {
  configFile?: string;
  outDir?: string;
  watch?: boolean;
  silent?: boolean;
  resolveFullPaths?: boolean;
}

type Assertion = (claim: any, message: string) => asserts claim;

export async function replaceTscAliasPaths(
  options: ReplaceTscAliasPathsOptions = {
    watch: false,
    silent: false
  }
) {
  const output = new Output(options.silent);

  output.info('=== tsc-alias starting ===');
  if (!options.configFile) {
    options.configFile = resolve(process.cwd(), 'tsconfig.json');
  } else {
    if (!isAbsolute(options.configFile)) {
      options.configFile = resolve(process.cwd(), options.configFile);
    }
  }

  const configFile = options.configFile;

  const assert: Assertion = (claim, message) =>
    claim || output.error(message, true);

  assert(existsSync(configFile), `Invalid file path => ${configFile}`);

  let { baseUrl, outDir, paths } = loadConfig(configFile);
  if (options.outDir) {
    outDir = options.outDir;
  }
  if (!baseUrl) {
    baseUrl = './';
  }
  assert(baseUrl, 'compilerOptions.baseUrl is not set');
  assert(paths, 'compilerOptions.paths is not set');
  assert(outDir, 'compilerOptions.outDir is not set');

  const configDir: string = normalizePath(dirname(configFile));

  const outPath = normalizePath(normalize(configDir + '/' + outDir));

  const confDirParentFolderName: string = basename(configDir);

  let hasExtraModule = false;
  let configDirInOutPath: string = null;
  let relConfDirPathInOutPath: string;

  const aliases = Object.keys(paths)
    .map((alias) => {
      const _paths = paths[alias as keyof typeof paths].map((path) => {
        path = path.replace(/\*$/, '').replace(/\.ts(x)?$/, '.js$1');
        if (isAbsolute(path)) {
          path = relative(configDir, path);
        }
        return path;
      });

      const path = _paths[0];

      const isExtra = null;
      const basePath = null;
      if (normalize(path).includes('..')) {
        if (!configDirInOutPath) {
          configDirInOutPath = getProjectDirPathInOutDir(
            outPath,
            confDirParentFolderName
          );
          if (configDirInOutPath) {
            hasExtraModule = true;
          }

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
          }
        }
      }

      let prefix = alias.replace(/\*$/, '');

      return {
        shouldPrefixMatchWildly: alias.endsWith('*'),
        prefix,
        basePath,
        path,
        paths: _paths,
        isExtra
      };
    })
    .filter(({ prefix }) => prefix)
    // When two aliases have starting strings in common, we treat the longest alias first.
    .sort((alias1, alias2) => alias2.prefix.length - alias1.prefix.length);

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

      const absoluteBasePath = normalizePath(
        normalize(`${tempBasePath}/${alias.path}`)
      );
      if (existsResolvedAlias(absoluteBasePath)) {
        alias.isExtra = false;
        alias.basePath = tempBasePath;
      } else {
        alias.isExtra = true;
        alias.basePath = absoluteBasePath;
      }
    } else if (hasExtraModule) {
      alias.isExtra = false;
      alias.basePath = normalizePath(
        normalize(
          `${configDir}/${outDir}/${relConfDirPathInOutPath}/${baseUrl}`
        )
      );
    } else {
      alias.basePath = normalizePath(normalize(`${configDir}/${outDir}`));
      alias.isExtra = false;
    }
  });

  const replaceImportStatement = ({
    orig,
    file,
    alias
  }: {
    orig: string;
    file: string;
    alias: typeof aliases[0];
  }): string => {
    const requiredModule = orig.match(newStringRegex())?.groups?.path;
    assert(
      typeof requiredModule == 'string',
      `Unexpected import statement pattern ${orig}`
    );
    const isAlias = alias.shouldPrefixMatchWildly
      ? // if the alias is like alias*
        // beware that typescript expects requiredModule be more than just alias
        requiredModule.startsWith(alias.prefix) &&
        requiredModule !== alias.prefix
      : // need to be a bit more careful if the alias doesn't ended with a *
        // in this case the statement must be like either
        // require('alias') or require('alias/path');
        // but not require('aliaspath');
        requiredModule === alias.prefix ||
        requiredModule.startsWith(alias.prefix + '/');

    if (isAlias) {
      let absoluteAliasPath = getAbsoluteAliasPath(alias.basePath, alias.path);
      let relativeAliasPath: string = normalizePath(
        relative(dirname(file), absoluteAliasPath)
      );

      if (!relativeAliasPath.startsWith('.')) {
        relativeAliasPath = './' + relativeAliasPath;
      }

      const index = orig.indexOf(alias.prefix);
      const newImportScript =
        orig.substring(0, index) +
        relativeAliasPath +
        '/' +
        orig.substring(index + alias.prefix.length);

      const modulePath = newImportScript.match(newStringRegex()).groups.path;

      return newImportScript.replace(modulePath, normalizePath(modulePath));
    }
    return orig;
  };

  const replaceAlias = async (
    file: string,
    resolveFullPath?: boolean
  ): Promise<boolean> => {
    const code = await fsp.readFile(file, 'utf8');
    let tempCode = code;
    for (const alias of aliases) {
      const replacementParams = {
        file,
        alias
      };
      tempCode = replaceSourceImportPaths(tempCode, file, (orig) =>
        replaceImportStatement({
          orig,
          ...replacementParams
        })
      );
    }

    // Fully resolve all import paths (not just aliased ones)
    // *after* the aliases are resolved
    if (resolveFullPath) {
      tempCode = resolveFullImportPaths(tempCode, file);
    }

    if (code !== tempCode) {
      await fsp.writeFile(file, tempCode, 'utf8');
      return true;
    }
    return false;
  };

  // Finding files and changing alias paths
  const globPattern = [
    `${outPath}/**/*.{js,jsx,d.ts,d.tsx}`,
    `!${outPath}/**/node_modules`
  ];
  const files = sync(globPattern, {
    dot: true,
    onlyFiles: true
  });

  // Make array with promises for file changes
  // Wait for all promises to resolve
  const replaceList = await Promise.all(
    files.map((file) => replaceAlias(file, options?.resolveFullPaths))
  );

  // Count all changed files
  const replaceCount = replaceList.reduce(
    (prev, curr) => (curr ? ++prev : prev),
    0
  );

  output.info(`${replaceCount} files were affected!`);
  if (options.watch) {
    output.info('[Watching for file changes...]');
    const filesWatcher = watch(globPattern);
    const tsconfigWatcher = watch(configFile);
    filesWatcher.on('change', async (file) => {
      await replaceAlias(file, options?.resolveFullPaths);
    });
    tsconfigWatcher.on('change', (_) => {
      output.clear();
      filesWatcher.close();
      tsconfigWatcher.close();
      replaceTscAliasPaths(options);
    });
  }
}

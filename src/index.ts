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
  resolveFullImportPaths,
  TrieNode
} from './utils';

export interface ReplaceTscAliasPathsOptions {
  configFile?: string;
  outDir?: string;
  watch?: boolean;
  silent?: boolean;
  resolveFullPaths?: boolean;
}

interface Alias {
  shouldPrefixMatchWildly: boolean;
  prefix: string;
  basePath: string;
  path: string;
  paths: string[];
  isExtra: boolean;
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

  const configFile = !options.configFile
    ? resolve(process.cwd(), 'tsconfig.json')
    : !isAbsolute(options.configFile)
    ? resolve(process.cwd(), options.configFile)
    : options.configFile;

  const assert: Assertion = (claim, message) =>
    claim || output.error(message, true);

  assert(existsSync(configFile), `Invalid file path => ${configFile}`);

  let { baseUrl = './', outDir, paths } = loadConfig(configFile);
  if (options.outDir) outDir = options.outDir;

  assert(outDir, 'compilerOptions.outDir is not set');

  const configDir: string = normalizePath(dirname(configFile));

  const outPath = normalizePath(normalize(configDir + '/' + outDir));

  const confDirParentFolderName: string = basename(configDir);

  let hasExtraModule = false;
  let configDirInOutPath: string = null;
  let relConfDirPathInOutPath: string;

  const AliasTrie = new TrieNode<Alias>();

  Object.keys(paths)
    .map((alias) => {
      const _paths = paths[alias].map((path) => {
        path = path.replace(/\*$/, '').replace(/\.([mc])?ts(x)?$/, '.$1js$2');
        if (isAbsolute(path)) {
          path = relative(configDir, path);
        }
        return path;
      });

      const path = _paths[0];

      if (normalize(path).includes('..')) {
        if (!configDirInOutPath) {
          configDirInOutPath = getProjectDirPathInOutDir(
            outPath,
            confDirParentFolderName
          );

          // Find relative path access of configDir in outPath
          if (configDirInOutPath) {
            hasExtraModule = true;
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

      return {
        shouldPrefixMatchWildly: alias.endsWith('*'),
        prefix: alias.replace(/\*$/, ''),
        basePath: null,
        path,
        paths: _paths,
        isExtra: null
      };
    })
    .filter(({ prefix }) => prefix)
    /*********** Find basepath of aliases *****************/
    .forEach((alias) => {
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

      // Add all aliases to AliasTrie.
      AliasTrie.add(alias.prefix, alias);
    });

  const replaceImportStatement = ({
    orig,
    file,
    alias
  }: {
    orig: string;
    file: string;
    alias: Alias;
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
      for (let i = 0; i < alias.paths.length; i++) {
        const absoluteAliasPath = getAbsoluteAliasPath(
          alias.basePath,
          alias.paths[i]
        );

        // Check if path is valid.
        if (
          !existsResolvedAlias(
            alias.prefix.length == requiredModule.length
              ? normalizePath(absoluteAliasPath)
              : normalizePath(
                  `${absoluteAliasPath}/${requiredModule.replace(
                    new RegExp(`^${alias.prefix}`),
                    ''
                  )}`
                )
          )
        ) {
          continue;
        }

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
    }
    return orig;
  };

  const replaceBaseUrlImport = ({
    orig,
    file
  }: {
    orig: string;
    file: string;
  }): string => {
    const requiredModule = orig.match(newStringRegex())?.groups?.path;
    assert(
      typeof requiredModule == 'string',
      `Unexpected import statement pattern ${orig}`
    );

    // Check if import is already resolved.
    if (requiredModule.startsWith('.')) {
      return orig;
    }

    // If there are files matching the target, resolve the path.
    if (existsResolvedAlias(`${outPath}/${requiredModule}`)) {
      let relativePath: string = normalizePath(
        relative(dirname(file), getAbsoluteAliasPath(outPath, ''))
      );
      if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
      }

      const index = orig.indexOf(requiredModule);
      const newImportScript =
        orig.substring(0, index) + relativePath + '/' + orig.substring(index);

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

    tempCode = replaceSourceImportPaths(tempCode, file, (orig) => {
      // Lookup which alias should be used for this given requiredModule.
      const alias = AliasTrie.search(
        orig.match(newStringRegex())?.groups?.path
      );
      // If an alias is found replace it or return the original.
      return alias
        ? replaceImportStatement({
            orig,
            file,
            alias
          })
        : orig;
    });

    tempCode = replaceSourceImportPaths(tempCode, file, (orig) =>
      replaceBaseUrlImport({
        orig,
        file
      })
    );

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
    `${outPath}/**/*.{mjs,cjs,js,jsx,d.{mts,cts,ts,tsx}}`,
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
    const onFileChange = async (file: string) =>
      await replaceAlias(file, options?.resolveFullPaths);
    filesWatcher.on('add', onFileChange);
    filesWatcher.on('change', onFileChange);
    tsconfigWatcher.on('change', (_) => {
      output.clear();
      filesWatcher.close();
      tsconfigWatcher.close();
      replaceTscAliasPaths(options);
    });
  }
}

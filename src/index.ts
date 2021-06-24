import { watch } from 'chokidar';
import { existsSync, readFileSync, writeFileSync } from 'fs';
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

export function replaceTscAliasPaths(
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
        path = path.replace(/\*$/, '').replace('.t', '.j');
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
      if (prefix[prefix.length - 1] === '/') {
        prefix = prefix.substring(0, prefix.length - 1);
      }
      return {
        prefix,
        basePath,
        path,
        paths: _paths,
        isExtra
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
    const index = orig.indexOf(alias.prefix);
    const isAlias = requiredModule.includes('/')
      ? requiredModule.startsWith(alias.prefix + '/')
      : requiredModule.startsWith(alias.prefix);
    if (index > -1 && isAlias) {
      let absoluteAliasPath = getAbsoluteAliasPath(alias.basePath, alias.path);
      let relativeAliasPath: string = normalizePath(
        relative(dirname(file), absoluteAliasPath)
      );

      if (!relativeAliasPath.startsWith('.')) {
        relativeAliasPath = './' + relativeAliasPath;
      }

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

  const replaceAlias = (file: string, resolveFullPath?: boolean): boolean => {
    const code = readFileSync(file, 'utf8');
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
      writeFileSync(file, tempCode, 'utf8');
      return true;
    }
    return false;
  };

  // Finding files and changing alias paths
  const globPattern = [
    `${outPath}/**/*.{js,jsx,ts,tsx}`,
    `!${outPath}/**/node_modules`
  ];
  const files = sync(globPattern, {
    dot: true,
    onlyFiles: true
  });

  const flen = files.length;
  let replaceCount = 0;
  for (let i = 0; i < flen; i += 1) {
    const file = files[i];
    if (replaceAlias(file, options?.resolveFullPaths)) {
      replaceCount++;
    }
  }

  output.info(`${replaceCount} files were affected!`);
  if (options.watch) {
    output.info('[Watching for file changes...]');
    const filesWatcher = watch(globPattern);
    const tsconfigWatcher = watch(configFile);
    filesWatcher.on('change', (file) => {
      replaceAlias(file, options?.resolveFullPaths);
    });
    tsconfigWatcher.on('change', (_) => {
      output.clear();
      filesWatcher.close();
      tsconfigWatcher.close();
      replaceTscAliasPaths(options);
    });
  }
}

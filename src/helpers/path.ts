/**
 * @file
 *
 * This file has all helperfunctions related to path resolution.
 */

/** */
import normalizePath = require('normalize-path');
import { sync } from 'globby';
import { normalize, relative, resolve } from 'path';
import { AliasPath, IProjectConfig } from '../interfaces';

/**
 * getProjectDirPathInOutDir finds the configDirInOutPath.
 * @param {string} outDir outDir loaded from tsconfig.
 * @param {string} projectDir  projectDir loaded from tsconfig.
 * @returns {string} the configDirInOutPath.
 */
function getProjectDirPathInOutDir(
  outDir: string,
  projectDir: string
): string | undefined {
  const posixOutput = outDir.replace(/\\/g, '/');
  const dirs = sync(
    [
      `${posixOutput}/**/${projectDir}`,
      `!${posixOutput}/**/${projectDir}/**/${projectDir}`,
      `!${posixOutput}/**/node_modules`
    ],
    {
      dot: true,
      onlyDirectories: true
    }
  );

  // Find the longest path
  return getLongestProjectPath(outDir, projectDir, dirs);
}

/**
 * Returns the `dir` that has the longest match with `posixOutput`.
 *
 * @example
 * getLongestProjectPath(
 *     '/project/path/lib',
 *     'path',
 *     ['/project/path/lib/project/path', '/project/path/lib/other/path'])
 * // Returns '/project/path/lib/project/path' because 'project/path' matches more than 'other/path'
 */
function getLongestProjectPath(outDir: string, projectDir: string, dirs: string[]) {
  const posixOutParts = outDir.replace(/\\/g, '/').split('/');
  const lastIndex = posixOutParts.lastIndexOf(projectDir);
  const result = dirs.reduce((longest, dir) => {
    const parts = dir.split('/');
    let length = 0;
    for (let i = parts.length - 1; i >= 0; --i) {
      if (parts[i] === posixOutParts[lastIndex - length]) {
        ++length;
      } else {
        break;
      }
    }
    return longest.matchLength > length ? longest : {matchLength: length, dir};
  }, {matchLength: 0, dir: ''});
  return result.dir;
}

/**
 * relativeOutPathToConfigDir
 * Finds relative path access of configDir in outPath
 */
export function relativeOutPathToConfigDir(config: IProjectConfig) {
  config.configDirInOutPath = getProjectDirPathInOutDir(
    config.outPath,
    config.confDirParentFolderName
  );

  // Find relative path access of configDir in outPath
  if (config.configDirInOutPath) {
    config.hasExtraModule = true;
    const stepsbackPath = relative(config.configDirInOutPath, config.outPath);
    const splitStepBackPath = normalizePath(stepsbackPath).split('/');
    const nbOfStepBack = splitStepBackPath.length;
    const splitConfDirInOutPath = config.configDirInOutPath.split('/');

    let i = 1;
    const splitRelPath: string[] = [];
    while (i <= nbOfStepBack) {
      splitRelPath.unshift(
        splitConfDirInOutPath[splitConfDirInOutPath.length - i]
      );
      i++;
    }
    config.relConfDirPathInOutPath = splitRelPath.join('/');
  }
}

/**
 * findBasePathOfAlias finds a basepath for every AliasPath.
 * And checks if isExtra should be true or false.
 * @param {IProjectConfig} config config object with all config values.
 */
export function findBasePathOfAlias(config: IProjectConfig) {
  return (path: string) => {
    const aliasPath = { path } as AliasPath;

    // If it's an alias that references a file outside the baseUrl
    if (normalize(aliasPath.path).includes('..')) {
      const tempBasePath = normalizePath(
        normalize(
          `${config.outDir}/` +
            `${
              config.hasExtraModule && config.relConfDirPathInOutPath
                ? config.relConfDirPathInOutPath
                : ''
            }/${config.baseUrl}`
        )
      );

      const absoluteBasePath = normalizePath(
        normalize(`${tempBasePath}/${aliasPath.path}`)
      );

      if (config.pathCache.existsResolvedAlias(absoluteBasePath)) {
        aliasPath.isExtra = false;
        aliasPath.basePath = tempBasePath;
      } else {
        aliasPath.isExtra = true;
        aliasPath.basePath = absoluteBasePath;
      }

      return aliasPath;
    }

    /**
     * If the alias refers to a file in the node_modules folder
     * located at the same level of baseUrl.
     * Because typescript will not include the node_modules
     * folder in the output folder (outDir).
     */
    if (aliasPath.path.match(/^(\.\/|)node_modules/g)) {
      aliasPath.basePath = resolve(config.baseUrl, 'node_modules');
      aliasPath.isExtra = false;
      return aliasPath;
    }

    // If the project references another external project
    if (config.hasExtraModule) {
      aliasPath.isExtra = false;
      aliasPath.basePath = normalizePath(
        normalize(
          `${config.outDir}/` +
            `${config.relConfDirPathInOutPath}/${config.baseUrl}`
        )
      );
      return aliasPath;
    }

    aliasPath.basePath = config.outDir;
    aliasPath.isExtra = false;
    return aliasPath;
  };
}

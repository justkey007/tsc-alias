/**
 * @file
 * Helper functions for resolving base paths of alias definitions.
 */

import { normalize, resolve } from 'path';
import { AliasPath, IProjectConfig } from '../interfaces';
import { resolveNestedBaseUrlPath } from './path-base-nested';
import normalizePath = require('normalize-path');

function resolveParentDirAliasPath(path: string, config: IProjectConfig): AliasPath {
  const aliasPath = { path } as AliasPath;
  let relConfPath = '';
  if (config.hasExtraModule && config.relConfDirPathInOutPath) {
    relConfPath = config.relConfDirPathInOutPath;
  }

  const tempBasePath = normalizePath(normalize(`${config.outDir}/${relConfPath}/${config.baseUrl}`));
  const absoluteBasePath = normalizePath(normalize(`${tempBasePath}/${aliasPath.path}`));

  if (config.pathCache.existsResolvedAlias(absoluteBasePath)) {
    aliasPath.isExtra = false;
    aliasPath.basePath = tempBasePath;
    return aliasPath;
  }

  aliasPath.isExtra = true;
  aliasPath.basePath = absoluteBasePath;
  return aliasPath;
}

/**
 * findBasePathOfAlias finds a basepath for every AliasPath
 * and determines if isExtra should be true or false.
 * @param {IProjectConfig} config config object with all config values.
 */
export function findBasePathOfAlias(config: IProjectConfig): (path: string) => AliasPath {
  return (path: string): AliasPath => {
    const aliasPath = { path } as AliasPath;

    // If it's an alias that references a file outside the baseUrl
    if (normalize(aliasPath.path).includes('..')) {
      return resolveParentDirAliasPath(aliasPath.path, config);
    }

    // If the alias refers to a file in node_modules at baseUrl level
    if (aliasPath.path.match(/^(\.\/|)node_modules/g)) {
      aliasPath.basePath = resolve(config.baseUrl, 'node_modules');
      aliasPath.isExtra = false;
      return aliasPath;
    }

    // If the project references another external project
    if (config.hasExtraModule) {
      aliasPath.isExtra = false;
      const fullExtraPath = `${config.outDir}/${config.relConfDirPathInOutPath}/${config.baseUrl}`;
      aliasPath.basePath = normalizePath(normalize(fullExtraPath));
      return aliasPath;
    }

    const nestedBase = resolveNestedBaseUrlPath(aliasPath.path, config);
    aliasPath.basePath = nestedBase ?? config.outDir!;
    aliasPath.isExtra = false;
    return aliasPath;
  };
}

/**
 * @file
 * Helper functions for locating and validating candidate alias paths.
 */

import { Alias, AliasPath, IConfig } from '../interfaces';
import { removeAliasPrefix } from './default.replacer.match';
import normalizePath = require('normalize-path');

export interface ICheckAliasPathParams {
  aliasPath: AliasPath;
  isLastPath: boolean;
  requiredModule: string;
  alias: Alias;
  config: IConfig;
}

export interface IFindResolvedAliasPathParams {
  alias: Alias;
  requiredModule: string;
  config: IConfig;
}

function checkSingleAliasPath(params: ICheckAliasPathParams): string | null {
  const { aliasPath, isLastPath, requiredModule, alias, config } = params;
  let absolutePath = config.pathCache.getAbsoluteAliasPath(aliasPath.basePath, aliasPath.path);
  config.output.debug('default replacer - absoluteAliasPath: ', absolutePath);

  if (absolutePath.startsWith('---')) {
    if (!isLastPath) return null;
    absolutePath = absolutePath.replace('---', '');
  }

  let resolvedPath = normalizePath(absolutePath);
  if (alias.prefix.length !== requiredModule.length) {
    const subPath = removeAliasPrefix(requiredModule, alias);
    resolvedPath = normalizePath(`${absolutePath}/${subPath}`);
  }

  if (!config.pathCache.existsResolvedAlias(resolvedPath)) {
    config.output.debug('default replacer - Invalid path');
    return null;
  }
  return absolutePath;
}

/**
 * Iterates through candidate paths of an alias to find the first valid resolved path.
 */
export function findResolvedAliasPath(params: IFindResolvedAliasPathParams): string | null {
  const { alias, requiredModule, config } = params;
  for (let i = 0; i < alias.paths.length; i++) {
    const isLastPath = i === alias.paths.length - 1;
    const resolved = checkSingleAliasPath({
      aliasPath: alias.paths[i],
      isLastPath,
      requiredModule,
      alias,
      config
    });
    if (resolved) return resolved;
  }
  return null;
}

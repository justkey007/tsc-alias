/**
 * @file
 * Helper functions for locating and validating candidate alias paths.
 */

import { Alias, AliasPath, IConfig } from '../interfaces';
import { parseWildcardPattern, substituteWildcard } from '../utils';
import { extractWildcardValue } from './default.replacer.match';
import normalizePath = require('normalize-path');

export interface ICheckAliasPathParams {
  aliasPath: AliasPath;
  requiredModule: string;
  alias: Alias;
  config: IConfig;
}

export interface IFindResolvedAliasPathParams {
  alias: Alias;
  requiredModule: string;
  config: IConfig;
}

function resolveConcreteTarget(aliasPath: AliasPath, starValue: string): string {
  const targetPattern = parseWildcardPattern(aliasPath.path);
  if (targetPattern.hasWildcard) {
    return substituteWildcard({ pattern: targetPattern, starValue });
  }
  if (starValue) {
    const sep = aliasPath.path ? '/' : '';
    return `${aliasPath.path}${sep}${starValue}`;
  }
  return aliasPath.path;
}

function checkSingleAliasPath(params: ICheckAliasPathParams): string | null {
  const { aliasPath, requiredModule, alias, config } = params;
  const starValue = extractWildcardValue(requiredModule, alias);
  const concretePath = resolveConcreteTarget(aliasPath, starValue);

  const absolutePath = config.pathCache.getAbsoluteAliasPath(aliasPath.basePath, concretePath);
  config.output.debug('default replacer - absoluteAliasPath: ', absolutePath);

  if (absolutePath.startsWith('---')) {
    config.output.debug('default replacer - Invalid path');
    return null;
  }

  const resolvedPath = normalizePath(absolutePath);
  if (!config.pathCache.existsResolvedAlias(resolvedPath)) {
    config.output.debug('default replacer - Invalid path');
    return null;
  }
  return resolvedPath;
}

/**
 * Iterates through candidate paths of an alias to find the first valid resolved path.
 */
export function findResolvedAliasPath(params: IFindResolvedAliasPathParams): string | null {
  const { alias, requiredModule, config } = params;
  for (const aliasPath of alias.paths) {
    const resolved = checkSingleAliasPath({
      aliasPath,
      requiredModule,
      alias,
      config
    });
    if (resolved) return resolved;
  }
  return null;
}

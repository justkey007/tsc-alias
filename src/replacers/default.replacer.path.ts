/**
 * @file
 * Helper functions for locating and validating candidate alias paths.
 */

import { statSync } from 'fs';
import { resolve } from 'path';
import { findMatchingReference } from '../helpers/reference-path-resolver';
import { Alias, AliasPath, IConfig } from '../interfaces';
import {
  convertDTSPathToJsExtension,
  normalizePathExtension,
  parseWildcardPattern,
  substituteWildcard
} from '../utils';
import { getImportablePath } from '../utils/path-validator';
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

function resolveExistingArtifact(aliasPath: AliasPath, concretePath: string, config: IConfig): string | null {
  if (aliasPath.path.match(/^(\.\/|)node_modules/)) return null;

  const sourcePath = resolve(config.configDir!, config.baseUrl, concretePath);
  if (findMatchingReference({ configFile: config.configFile, sourcePath })) return null;

  const importablePath = getImportablePath(sourcePath, config.pathCache.fileExtensions);
  if (
    !importablePath ||
    !config.pathCache.fileExtensions.some((extension) => importablePath.endsWith(`.${extension}`))
  ) {
    return null;
  }

  const runtimePath = normalizePathExtension(convertDTSPathToJsExtension(importablePath));
  if (!statSync(runtimePath, { throwIfNoEntry: false })?.isFile()) return null;

  return normalizePath(runtimePath);
}

function checkSingleAliasPath(params: ICheckAliasPathParams): string | null {
  const { aliasPath, requiredModule, alias, config } = params;
  const starValue = extractWildcardValue(requiredModule, alias);
  const concretePath = resolveConcreteTarget(aliasPath, starValue);

  const absolutePath = config.pathCache.getAbsoluteAliasPath(aliasPath.basePath, concretePath);
  config.output.debug('default replacer - absoluteAliasPath: ', absolutePath);

  if (!absolutePath.startsWith('---')) {
    const resolvedPath = normalizePath(absolutePath);
    if (config.pathCache.existsResolvedAlias(resolvedPath)) return resolvedPath;
  }

  config.output.debug('default replacer - Invalid path');
  return resolveExistingArtifact(aliasPath, concretePath, config);
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
    if (resolved) return convertDTSPathToJsExtension(resolved);
  }
  return null;
}

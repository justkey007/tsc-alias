/**
 * @file
 * Path and extension normalization helpers for alias resolution.
 */

import { isAbsolute, normalize, relative, resolve } from 'path';
import { relativeOutPathToConfigDir } from '../helpers';
import { IProjectConfig } from '../interfaces';

export interface INormalizePathParams {
  path: string;
  config: IProjectConfig;
}

/**
 * Checks if an extension represents a TypeScript declaration file.
 */
export function isDTS(extension: string): boolean {
  return /\.d(\..*)?\.[mc]?ts(x)?$/.test(extension);
}

/**
 * Normalizes TypeScript extensions to JavaScript equivalents.
 */
export function normalizePathExtension(path: string): string {
  const dotIndex = path.lastIndexOf('.');
  const beforeDot = path.slice(0, dotIndex);
  const afterDot = path.slice(dotIndex);

  // Refuse to normalize extensions for paths that look like "a.b/c" or "a.b\c".
  if (afterDot.includes('/') || afterDot.includes('\\')) {
    return path;
  }

  const normalizedExt = isDTS(afterDot)
    ? afterDot
    : afterDot.replace(/\.([mc])?ts(x)?$/, '.$1js$2');

  return `${beforeDot}${normalizedExt}`;
}

/**
 * Normalizes an alias path and updates project config when needed.
 */
export function normalizeAliasPath(params: INormalizePathParams): string {
  const { path: rawPath, config } = params;
  let path = rawPath.replace(/\*$/, '');
  path = normalizePathExtension(path);

  if (isAbsolute(path)) {
    path = relative(resolve(config.configDir!, config.baseUrl), path);
  }

  if (normalize(path).includes('..') && !config.configDirInOutPath) {
    relativeOutPathToConfigDir(config);
  }

  return path;
}

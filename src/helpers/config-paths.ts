/**
 * @file
 * Helper functions for resolving tsconfig paths and placeholders.
 */

import { isAbsolute, join, relative, resolve } from 'path';
import { PathLike } from '../interfaces';

export interface IResolveRelativePathsParams {
  paths: PathLike;
  configDir: string;
  rootDir: string;
}

export function replaceConfigDirPlaceholder(path: string, configDir: string): string {
  return path.replace(/\$\{configDir\}/g, configDir);
}

export function resolveDirectoryPath(dir: string, configDir: string, baseConfigDir: string | null): string {
  let replaced = dir;
  if (baseConfigDir !== null) {
    replaced = replaceConfigDirPlaceholder(dir, baseConfigDir);
  }
  if (isAbsolute(replaced)) {
    return replaced;
  }
  return join(configDir, replaced);
}

export function applyBaseConfigDirToPaths(paths: PathLike, baseConfigDir: string): PathLike {
  for (const key in paths) {
    paths[key] = paths[key].map((path) => replaceConfigDirPlaceholder(path, baseConfigDir));
  }
  return paths;
}

export function resolvePathsWithoutBaseUrl(params: IResolveRelativePathsParams): PathLike {
  const { paths, configDir, rootDir } = params;
  const resolvedRootDir = resolve(configDir, rootDir);

  for (const key in paths) {
    paths[key] = paths[key].map((path) => relative(resolvedRootDir, resolve(configDir, path)));
  }
  return paths;
}

/**
 * @file
 * Resolves full file paths for bare package subpath imports.
 */

import { existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { SCOPED_PACKAGE_PREFIX } from './constants';
import { packageDefinesExports } from './package-exports';

export interface IResolveRuntimePathParams {
  importPath: string;
  absolutePath: string;
  extensions: string[];
}

export interface IResolvePackageSubpathParams {
  importPath: string;
  sourceDir: string;
  extensions: string[];
}

interface IPackageSubpath {
  packageParts: string[];
  subpathParts: string[];
}

export function resolveExistingRuntimePath(params: IResolveRuntimePathParams): string {
  const { importPath, absolutePath, extensions } = params;
  const ext = extensions.find((candidate) => existsSync(`${absolutePath}${candidate}`));
  if (ext) return `${importPath}${ext}`;

  const indexExt = extensions.find((c) => existsSync(join(absolutePath, `index${c}`)));
  if (!indexExt) return importPath;

  const indexPath = join(importPath, `index${indexExt}`);
  const needsDot = (importPath === '.' || importPath.startsWith('./')) && !indexPath.startsWith('./');
  if (needsDot) return `./${indexPath}`;
  return indexPath;
}

function splitPackageSubpath(importPath: string): IPackageSubpath | undefined {
  const parts = importPath.split('/');
  let count = 1;
  if (parts[0].startsWith(SCOPED_PACKAGE_PREFIX)) count = 2;
  if (parts.length <= count || parts.slice(0, count).some((p) => !p)) return undefined;

  const subpathParts = parts.slice(count);
  if (subpathParts.some((p) => p === '.' || p === '..')) return undefined;
  return { packageParts: parts.slice(0, count), subpathParts };
}

export function resolvePackageSubpath(params: IResolvePackageSubpathParams): string {
  const { importPath, sourceDir, extensions } = params;
  const parsed = splitPackageSubpath(importPath);
  if (!parsed) return importPath;

  const { packageParts, subpathParts } = parsed;
  let dir = sourceDir;
  let isAtRoot = false;

  while (!isAtRoot) {
    const root = resolve(dir, 'node_modules', ...packageParts);
    if (packageDefinesExports(root)) return importPath;

    const resolved = resolveExistingRuntimePath({
      importPath,
      absolutePath: resolve(root, ...subpathParts),
      extensions
    });
    if (resolved !== importPath) return resolved;

    const parent = dirname(dir);
    isAtRoot = parent === dir;
    dir = parent;
  }
  return importPath;
}

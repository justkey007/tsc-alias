/**
 * @file
 * PathCache class caches path lookups and resolves project reference paths.
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { findMatchingReference, resolveReferenceTargetPath } from '../helpers';
import { splitPathByParentSteps } from './path';
import { getImportablePath } from './path-validator';

export class PathCache {
  useCache: boolean;
  existsCache?: Map<string, boolean>;
  absoluteCache?: Map<string, string>;
  fileExtensions: string[];

  constructor(useCache: boolean, fileExtensions?: string[], public configFile?: string) {
    this.fileExtensions = fileExtensions || ['js', 'json', 'jsx', 'cjs', 'mjs', 'd.ts', 'd.tsx', 'd.cts', 'd.mts'];
    this.useCache = useCache;
    if (useCache) {
      this.existsCache = new Map();
      this.absoluteCache = new Map();
    }
  }

  /**
   * existsResolvedAlias checks if file exists, uses cache when possible.
   * @param {string} path the filepath to check.
   * @returns {boolean} result of check.
   */
  public existsResolvedAlias(path: string): boolean {
    if (!this.useCache) return this.exists(path);
    if (this.existsCache!.has(path)) {
      return this.existsCache!.get(path)!;
    } else {
      const result = this.exists(path);
      this.existsCache!.set(path, result);
      return result;
    }
  }

  /**
   * getAbsoluteAliasPath finds the absolute alias path, uses cache when possible.
   * @param {string} basePath the basepath of the alias.
   * @param {string} aliasPath the aliaspath of the alias.
   * @returns {string} the absolute alias path.
   */
  public getAbsoluteAliasPath(basePath: string, aliasPath: string): string {
    const request = { basePath, aliasPath };
    if (!this.useCache) return this.getAAP(request);
    const key = `${basePath}___${aliasPath}`;
    if (this.absoluteCache!.has(key)) return this.absoluteCache!.get(key)!;
    const result = this.getAAP(request);
    this.absoluteCache!.set(key, result);
    return result;
  }

  private getAAP(params: { basePath: string; aliasPath: string }): string {
    const { aliasPath } = params;
    const { parentSteps, remainingPath } = splitPathByParentSteps(aliasPath);
    const basePath = join(params.basePath, parentSteps);
    const aliasPathParts = remainingPath.split('/').filter((part) => !part.match(/^\.$|^\s*$/));
    let aliasPathPart = aliasPathParts.shift() || '';
    let found = false;

    while (!(found = this.exists(join(basePath, aliasPathPart))) && aliasPathParts.length) {
      aliasPathPart = aliasPathParts.shift()!;
    }

    if (found) {
      const absolutePath = join(basePath, aliasPathPart, aliasPathParts.join('/'));
      const importablePath = getImportablePath(absolutePath, this.fileExtensions);
      if (importablePath) return importablePath;

      const matchingRef = findMatchingReference({ configFile: this.configFile, sourcePath: absolutePath });
      if (matchingRef) {
        const refPath = resolveReferenceTargetPath({
          reference: matchingRef,
          sourcePath: absolutePath,
          fileExtensions: this.fileExtensions
        });
        if (refPath) return refPath;
      }
    }

    return '---' + join(basePath, aliasPathParts.join('/'));
  }

  /**
   * exists checks if file exists.
   * @param path the filepath to check.
   * @returns {boolean} result of check.
   */
  private exists(path: string): boolean {
    return existsSync(path) || this.fileExtensions.some((extension) => existsSync(`${path}.${extension}`));
  }
}

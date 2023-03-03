/**
 * @file
 *
 * The PathCache class is meant to cache path lookups like
 * exists and getAbsoluteAliasPath.
 */

/** */
import { existsSync } from 'fs';
import { join } from 'path';

export class PathCache {
  useCache: boolean;
  existsCache: Map<string, boolean>;
  absoluteCache: Map<string, string>;
  fileExtensions: string[];

  constructor(useCache: boolean, fileExtensions?: string[]) {
    this.fileExtensions = fileExtensions || [
      'js',
      'json',
      'jsx',
      'cjs',
      'mjs',
      'd.ts',
      'd.tsx',
      'd.cts',
      'd.mts'
    ];
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
    if (this.existsCache.has(path)) {
      return this.existsCache.get(path);
    } else {
      const result = this.exists(path);
      this.existsCache.set(path, result);
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
    if (this.absoluteCache.has(this.getCacheKey(request))) {
      return this.absoluteCache.get(this.getCacheKey(request));
    } else {
      const result = this.getAAP(request);
      this.absoluteCache.set(this.getCacheKey(request), result);
      return result;
    }
  }

  private getCacheKey({
    basePath,
    aliasPath
  }: {
    basePath: string;
    aliasPath: string;
  }): string {
    return `${basePath}___${aliasPath}`;
  }

  /**
   * getAAP finds the absolute alias path.
   * @param {string} basePath the basepath of the alias.
   * @param {string} aliasPath the aliaspath of the alias.
   * @returns {string} the absolute alias path.
   */
  private getAAP({
    basePath,
    aliasPath
  }: {
    basePath: string;
    aliasPath: string;
  }): string {
    const aliasPathParts = aliasPath
      .split('/')
      .filter((part) => !part.match(/^\.$|^\s*$/));

    let aliasPathPart = aliasPathParts.shift() || '';

    let pathExists: boolean;
    while (
      !(pathExists = this.exists(join(basePath, aliasPathPart))) &&
      aliasPathParts.length
    ) {
      aliasPathPart = aliasPathParts.shift();
    }

    return join(
      basePath,
      pathExists ? aliasPathPart : '',
      aliasPathParts.join('/')
    );
  }

  /**
   * exists checks if file exists.
   * @param path the filepath to check.
   * @returns {boolean} result of check.
   */
  private exists(path: string): boolean {
    return (
      existsSync(path) ||
      this.fileExtensions.some((extension) =>
        existsSync(`${path}.${extension}`)
      )
    );
  }
}

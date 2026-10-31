/**
 * @file
 * Resolves full import paths in source code files.
 */

import { dirname, resolve } from 'path';
import { StringReplacer } from '../interfaces';
import { DEFAULT_IMPORT_EXTENSION, DEFAULT_RUNTIME_EXTENSIONS } from './constants';
import { newImportStatementRegex, newStringRegex } from './import-regex';
import { resolveExistingRuntimePath, resolvePackageSubpath } from './package-subpath-resolver';
import normalizePath = require('normalize-path');

export interface IResolveFullImportPathsParams {
  code: string;
  path: string;
  ext?: string;
  resolvePackageSubpaths?: boolean;
}

function runtimeExtensions(preferredExtension: string): string[] {
  return Array.from(new Set([preferredExtension, ...DEFAULT_RUNTIME_EXTENSIONS]));
}

class ImportPathResolver {
  constructor(public source: string, readonly sourcePath: string, readonly resolvePackageSubpaths = true) {}

  get sourceDir() {
    return dirname(this.sourcePath);
  }

  /**
   * Replace all source import paths, using a replacer
   * function (a la `String.prototype.replace(globalRegex,replacer)`)
   */
  replaceSourceImportPaths(replacer: StringReplacer) {
    this.source = this.source.replace(newImportStatementRegex('g'), replacer);
    return this;
  }

  resolveFullImportPaths(ext = DEFAULT_IMPORT_EXTENSION) {
    this.replaceSourceImportPaths((importStatement) => {
      const match = importStatement.match(newStringRegex());
      if (!match) return importStatement;
      const { path, pathWithQuotes } = match.groups as { path: string; pathWithQuotes: string };
      const fullPath = normalizePath(this.resolveFullPath(path, ext));
      return importStatement.replace(pathWithQuotes, pathWithQuotes.replace(path, fullPath));
    });
    return this;
  }

  private resolveFullPath(importPath: string, ext = DEFAULT_IMPORT_EXTENSION) {
    const extensions = runtimeExtensions(ext);
    if (extensions.some((extension) => importPath.endsWith(extension))) return importPath;

    if (!importPath.startsWith('.')) {
      if (!this.resolvePackageSubpaths) return importPath;
      return resolvePackageSubpath({ importPath, sourceDir: this.sourceDir, extensions });
    }

    return resolveExistingRuntimePath({
      importPath,
      absolutePath: resolve(this.sourceDir, importPath),
      extensions
    });
  }

  static newStringRegex = newStringRegex;
  static newImportStatementRegex = newImportStatementRegex;

  static resolveFullImportPaths(params: IResolveFullImportPathsParams) {
    const { code, path, ext = DEFAULT_IMPORT_EXTENSION, resolvePackageSubpaths = true } = params;
    return new ImportPathResolver(code, path, resolvePackageSubpaths).resolveFullImportPaths(ext).source;
  }

  static replaceSourceImportPaths(code: string, path: string, replacer: StringReplacer) {
    return new ImportPathResolver(code, path).replaceSourceImportPaths(replacer).source;
  }
}

// Export aliases for the static functions to make usage more friendly.
export { newImportStatementRegex, newStringRegex };
export const resolveFullImportPaths = ImportPathResolver.resolveFullImportPaths;
export const replaceSourceImportPaths = ImportPathResolver.replaceSourceImportPaths;

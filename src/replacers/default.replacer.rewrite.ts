/**
 * @file
 * Helper functions for rewriting import statements with relative paths.
 */

import { dirname, relative } from 'path';
import { Alias } from '../interfaces';
import { newStringRegex } from '../utils';
import normalizePath = require('normalize-path');

export interface IRewriteImportStatementParams {
  orig: string;
  alias: Alias;
  relativeAliasPath: string;
  requiredModule?: string;
}

/**
 * Formats an absolute alias path into a normalized relative import path.
 */
export function formatRelativeAliasPath(file: string, absoluteAliasPath: string): string {
  let relativePath = normalizePath(relative(dirname(file), absoluteAliasPath));
  if (!relativePath.startsWith('.')) {
    relativePath = `./${relativePath}`;
  }
  return relativePath;
}

/**
 * Rewrites the original import statement string with the new relative path.
 */
export function rewriteImportStatement(params: IRewriteImportStatementParams): string {
  const { orig, alias, relativeAliasPath, requiredModule } = params;

  if (requiredModule) {
    const specifierRegex = /(["'])(?<path>[^"'\r\n]+)\1/;
    const match = orig.match(specifierRegex);
    if (match && match.groups?.path === requiredModule) {
      const quote = match[1];
      const quotedOld = `${quote}${requiredModule}${quote}`;
      const quotedNew = `${quote}${normalizePath(relativeAliasPath)}${quote}`;
      return orig.replace(quotedOld, quotedNew);
    }
  }

  let index = orig.indexOf(alias.prefix);

  if (!alias.prefix) {
    const specifierRegex = /(?<quoted>["'](?<path>[^"'\r\n]+)["'])/;
    const match = orig.match(specifierRegex);
    const specifier = match?.groups?.path;
    if (specifier) {
      index = orig.indexOf(specifier);
    }
  }

  const prefixLength = alias.prefix.length;
  const newImportScript = `${orig.substring(0, index)}${relativeAliasPath}/${orig.substring(index + prefixLength)}`;

  const moduleMatch = newImportScript.match(newStringRegex());
  const modulePath = moduleMatch?.groups?.path;
  if (!modulePath) {
    return newImportScript;
  }

  return newImportScript.replace(modulePath, normalizePath(modulePath));
}

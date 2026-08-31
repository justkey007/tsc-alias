/**
 * @file
 *
 * The default replacer replaces the alias in an import statement
 * with the proper aliased location.
 */

import { AliasReplacerArguments } from '../interfaces';
import { newStringRegex } from '../utils';
import { isMatchingAlias } from './default.replacer.match';
import { findResolvedAliasPath } from './default.replacer.path';
import { formatRelativeAliasPath, rewriteImportStatement } from './default.replacer.rewrite';

/**
 * replaceImportStatement replaces the import statement with the aliased path.
 * @param {AliasReplacerArguments} args arguments object for replacer.
 * @returns {string} modified import statement or original string.
 */
export default function replaceImportStatement(args: AliasReplacerArguments): string {
  const { orig, file, config } = args;
  const requiredModule = orig.match(newStringRegex())?.groups?.path;
  config.output.debug('default replacer - requiredModule: ', requiredModule);
  config.output.assert(typeof requiredModule === 'string', `Unexpected import statement pattern ${orig}`);

  // Lookup which alias should be used for this given requiredModule.
  const alias = config.aliasTrie.search(requiredModule!);
  config.output.debug('default replacer - alias: ', alias);
  if (!alias) return orig;

  if (!isMatchingAlias({ requiredModule: requiredModule!, alias })) {
    return orig;
  }

  const absoluteAliasPath = findResolvedAliasPath({
    alias,
    requiredModule: requiredModule!,
    config
  });
  if (!absoluteAliasPath) {
    return orig;
  }

  const relativeAliasPath = formatRelativeAliasPath(file, absoluteAliasPath);
  config.output.debug('default replacer - relativeAliasPath: ', relativeAliasPath);

  const result = rewriteImportStatement({ orig, alias, relativeAliasPath });
  config.output.debug('default replacer - newImportScript: ', result);
  return result;
}

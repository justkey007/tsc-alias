/**
 * @file
 *
 * The baseUrl replacer replaces the import statement
 * with the baseUrl + import statement location.
 */

import { dirname, relative } from 'path';
import { AliasReplacerArguments } from '../interfaces';
import { newStringRegex } from '../utils';
import { isImportablePath } from '../utils/path-validator';
import normalizePath = require('normalize-path');

/**
 * replaceBaseUrlImport replaces baseUrl-relative imports with relative file paths.
 * @param {AliasReplacerArguments} args replacer argument object.
 * @returns {string} modified import statement or original string.
 */
export default function replaceBaseUrlImport(args: AliasReplacerArguments): string {
  const { orig, file, config } = args;
  const requiredModule = orig.match(newStringRegex())?.groups?.path;
  config.output.debug('base-url replacer - requiredModule: ', requiredModule);
  config.output.assert(typeof requiredModule === 'string', `Unexpected import statement pattern ${orig}`);

  // Check if import is already resolved.
  if (requiredModule!.startsWith('.')) {
    config.output.debug('base-url replacer - already resolved');
    return orig;
  }

  const targetPath = `${config.outPath}/${requiredModule}`;
  if (!isImportablePath(targetPath, config.pathCache.fileExtensions)) {
    return orig;
  }

  const rawAbsolute = config.pathCache.getAbsoluteAliasPath(config.outPath, '').replace('---', '');
  let relativePath = normalizePath(relative(dirname(file), rawAbsolute));
  if (!relativePath.startsWith('.')) {
    relativePath = `./${relativePath}`;
  }
  config.output.debug('base-url replacer - relativePath: ', relativePath);

  const index = orig.indexOf(requiredModule!);
  const newImportScript = `${orig.substring(0, index)}${relativePath}/${orig.substring(index)}`;
  config.output.debug('base-url replacer - newImportScript: ', newImportScript);

  const moduleMatch = newImportScript.match(newStringRegex());
  const modulePath = moduleMatch?.groups?.path;
  if (!modulePath) return newImportScript;

  config.output.debug('base-url replacer - modulePath: ', modulePath);
  return newImportScript.replace(modulePath, normalizePath(modulePath));
}

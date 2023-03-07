/**
 * @file
 *
 * The default replacer replaces the alias in an import statement
 * with the proper aliased location.
 */

/** */
import normalizePath = require('normalize-path');
import { dirname, relative } from 'path';
import { Alias, AliasReplacerArguments } from '../interfaces';
import { newStringRegex } from '../utils';

function escapeSpecialChars(str: string) {
  return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

function getAliasPrefixRegExp(alias: Alias) {
  return new RegExp(
    `(?:^${escapeSpecialChars(alias.prefix)})|(?:\\.(js|json)$)`,
    'g'
  );
}

function removeAliasPrefix(requiredModule: string, alias: Alias) {
  return requiredModule.replace(getAliasPrefixRegExp(alias), '');
}

export default function replaceImportStatement({
  orig,
  file,
  config
}: AliasReplacerArguments) {
  const requiredModule = orig.match(newStringRegex())?.groups?.path;
  config.output.debug('default replacer - requiredModule: ', requiredModule);
  config.output.assert(
    typeof requiredModule == 'string',
    `Unexpected import statement pattern ${orig}`
  );
  // Lookup which alias should be used for this given requiredModule.
  const alias = config.aliasTrie.search(requiredModule);
  config.output.debug('default replacer - alias: ', alias);
  // If an alias isn't found the original.
  if (!alias) return orig;

  const isAlias = alias.shouldPrefixMatchWildly
    ? // if the alias is like alias*
      // beware that typescript expects requiredModule be more than just alias
      requiredModule.startsWith(alias.prefix) && requiredModule !== alias.prefix
    : // need to be a bit more careful if the alias doesn't ended with a *
      // in this case the statement must be like either
      // require('alias') or require('alias/path');
      // but not require('aliaspath');
      requiredModule === alias.prefix ||
      requiredModule.startsWith(alias.prefix + '/');

  if (isAlias) {
    for (let i = 0; i < alias.paths.length; i++) {
      let absoluteAliasPath = config.pathCache.getAbsoluteAliasPath(
        alias.paths[i].basePath,
        alias.paths[i].path
      );
      config.output.debug(
        'default replacer - absoluteAliasPath: ',
        absoluteAliasPath
      );

      if (absoluteAliasPath.startsWith('---')) {
        if (i === alias.paths.length - 1) {
          absoluteAliasPath = absoluteAliasPath.replace('---', '');
        } else {
          continue;
        }
      }

      // Check if path is valid.
      if (
        !config.pathCache.existsResolvedAlias(
          alias.prefix.length == requiredModule.length
            ? normalizePath(absoluteAliasPath)
            : normalizePath(
                `${absoluteAliasPath}/${removeAliasPrefix(
                  requiredModule,
                  alias
                )}`
              )
        )
      ) {
        config.output.debug('default replacer - Invalid path');
        continue;
      }

      let relativeAliasPath: string = normalizePath(
        relative(dirname(file), absoluteAliasPath)
      );

      if (!relativeAliasPath.startsWith('.')) {
        relativeAliasPath = './' + relativeAliasPath;
      }
      config.output.debug(
        'default replacer - relativeAliasPath: ',
        relativeAliasPath
      );

      const index = orig.indexOf(alias.prefix);
      const newImportScript =
        orig.substring(0, index) +
        relativeAliasPath +
        '/' +
        orig.substring(index + alias.prefix.length);
      config.output.debug(
        'default replacer - newImportScript: ',
        newImportScript
      );

      const modulePath = newImportScript.match(newStringRegex()).groups.path;
      config.output.debug('default replacer - modulePath: ', modulePath);

      return newImportScript.replace(modulePath, normalizePath(modulePath));
    }
  }
  return orig;
}

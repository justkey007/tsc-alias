import * as normalizePath from 'normalize-path';
import { dirname, relative } from 'path';
import { existsResolvedAlias, getAbsoluteAliasPath } from '.';
import { Assertion, Alias, IConfig } from '../interfaces';
import { newStringRegex } from '../utils';

export function replaceImportStatement(
  {
    orig,
    file,
    alias
  }: {
    orig: string;
    file: string;
    alias: Alias;
  },
  assert: Assertion
): string {
  const requiredModule = orig.match(newStringRegex())?.groups?.path;
  assert(
    typeof requiredModule == 'string',
    `Unexpected import statement pattern ${orig}`
  );
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
      const absoluteAliasPath = getAbsoluteAliasPath(
        alias.paths[i].basePath,
        alias.paths[i].path
      );

      // Check if path is valid.
      if (
        !existsResolvedAlias(
          alias.prefix.length == requiredModule.length
            ? normalizePath(absoluteAliasPath)
            : normalizePath(
                `${absoluteAliasPath}/${requiredModule.replace(
                  new RegExp(`^${alias.prefix}`),
                  ''
                )}`
              )
        )
      ) {
        continue;
      }

      let relativeAliasPath: string = normalizePath(
        relative(dirname(file), absoluteAliasPath)
      );

      if (!relativeAliasPath.startsWith('.')) {
        relativeAliasPath = './' + relativeAliasPath;
      }

      const index = orig.indexOf(alias.prefix);
      const newImportScript =
        orig.substring(0, index) +
        relativeAliasPath +
        '/' +
        orig.substring(index + alias.prefix.length);

      const modulePath = newImportScript.match(newStringRegex()).groups.path;

      return newImportScript.replace(modulePath, normalizePath(modulePath));
    }
  }
  return orig;
}

export function replaceBaseUrlImport(
  {
    orig,
    file
  }: {
    orig: string;
    file: string;
  },
  assert: Assertion,
  config: IConfig
): string {
  const requiredModule = orig.match(newStringRegex())?.groups?.path;
  assert(
    typeof requiredModule == 'string',
    `Unexpected import statement pattern ${orig}`
  );

  // Check if import is already resolved.
  if (requiredModule.startsWith('.')) {
    return orig;
  }

  // If there are files matching the target, resolve the path.
  if (existsResolvedAlias(`${config.outPath}/${requiredModule}`)) {
    let relativePath: string = normalizePath(
      relative(dirname(file), getAbsoluteAliasPath(config.outPath, ''))
    );
    if (!relativePath.startsWith('.')) {
      relativePath = './' + relativePath;
    }

    const index = orig.indexOf(requiredModule);
    const newImportScript =
      orig.substring(0, index) + relativePath + '/' + orig.substring(index);

    const modulePath = newImportScript.match(newStringRegex()).groups.path;
    return newImportScript.replace(modulePath, normalizePath(modulePath));
  }
  return orig;
}

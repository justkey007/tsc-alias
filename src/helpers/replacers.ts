import * as normalizePath from 'normalize-path';
import * as findNodeModulesPath from 'find-node-modules';
import { dirname, join, relative } from 'path';
import { AliasReplacerArguments, IConfig } from '../interfaces';
import { newStringRegex } from '../utils';
import { existsSync } from 'fs';

export function importReplacers(files: string[], config: IConfig) {
  const dir = process.cwd();
  const node_modules: string[] = findNodeModulesPath({ cwd: dir });

  files.forEach(async (file) => {
    // Try to import replacer.
    const tryImportReplacer = async (targetPath: string) => {
      const replacerModule = await import(targetPath);
      config.replacers.push(replacerModule.default);
      config.output.info(`Added replacer "${file}"`);
    };

    // Look for replacer in cwd.
    const path = normalizePath(dir + '/' + file);
    if (existsSync(path)) {
      try {
        await tryImportReplacer(path);
        return;
      } catch {}
    }

    // Look for replacer in node_modules.
    for (const targetPath of node_modules.map((v) => join(dir, v, file))) {
      try {
        await tryImportReplacer(targetPath);
        return;
      } catch {}
    }

    config.output.error(`Failed to import replacer "${file}"`);
  });
}

export function replaceImportStatement({
  orig,
  file,
  config
}: AliasReplacerArguments) {
  const requiredModule = orig.match(newStringRegex())?.groups?.path;
  config.output.assert(
    typeof requiredModule == 'string',
    `Unexpected import statement pattern ${orig}`
  );
  // Lookup which alias should be used for this given requiredModule.
  const alias = config.aliasTrie.search(requiredModule);
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
      const absoluteAliasPath = config.pathCache.getAbsoluteAliasPath(
        alias.paths[i].basePath,
        alias.paths[i].path
      );

      // Check if path is valid.
      if (
        !config.pathCache.existsResolvedAlias(
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

export function replaceBaseUrlImport({
  orig,
  file,
  config
}: AliasReplacerArguments): string {
  const requiredModule = orig.match(newStringRegex())?.groups?.path;
  config.output.assert(
    typeof requiredModule == 'string',
    `Unexpected import statement pattern ${orig}`
  );

  // Check if import is already resolved.
  if (requiredModule.startsWith('.')) {
    return orig;
  }

  // If there are files matching the target, resolve the path.
  if (
    config.pathCache.existsResolvedAlias(`${config.outPath}/${requiredModule}`)
  ) {
    let relativePath: string = normalizePath(
      relative(
        dirname(file),
        config.pathCache.getAbsoluteAliasPath(config.outPath, '')
      )
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

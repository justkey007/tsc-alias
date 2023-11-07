/**
 * @file
 *
 * This file has all helperfunctions related to replacing.
 */

/** */
import { existsSync, promises as fsp } from 'fs';
import { Dir } from 'mylas';
import { isAbsolute, join } from 'path';
import { IConfig, ReplacerOptions } from '../interfaces';
import { replaceSourceImportPaths, resolveFullImportPaths } from '../utils';
import normalizePath = require('normalize-path');

/**
 * importReplacers imports replacers for tsc-alias to use.
 * @param {IConfig} config the tsc-alias config object.
 * @param {ReplacerOptions} replacers the tsc-alias replacer options.
 * @param {string[]} cmdReplacers array of filepaths to replacers from command-line.
 */
export async function importReplacers(
  config: IConfig,
  replacers: ReplacerOptions,
  cmdReplacers?: string[]
) {
  config.output.debug('Started loading replacers');
  const dir = process.cwd();
  const node_modules: string[] = Dir.nodeModules({ cwd: dir });
  config.output.debug('Found node_modules:', node_modules);

  // List of default replacers.
  const defaultReplacers: ReplacerOptions = {
    default: {
      enabled: true
    },
    'base-url': {
      enabled: !!config.baseUrl
    }
  };

  // List of all replacers.
  let merged: ReplacerOptions = {
    ...defaultReplacers,
    ...replacers
  };

  // Added replacers to list from command-line filepaths.
  config.output.debug(
    'Added replacers to list from command-line filepaths:',
    cmdReplacers
  );
  cmdReplacers?.forEach((v) => {
    merged[v] = {
      enabled: true,
      file: v
    };
  });

  config.output.debug('Reading replacers config');
  const entries = Object.entries(merged);
  for await (const replacer of entries) {
    if (replacer[1].enabled) {
      // Importing default replacers.
      if (Object.keys(defaultReplacers).includes(replacer[0])) {
        config.output.debug('Loading default replacer:', replacer);
        const replacerModule = await import(
          `../replacers/${replacer[0]}.replacer`
        );
        config.replacers.push(replacerModule.default);
      }

      const file = replacer[1]?.file;
      if (!file) {
        config.output.debug('Replacer has no file:', replacer);
        continue; // When file is undefined don't try to import.
      }
      // Try to import replacer.
      const tryImportReplacer = async (targetPath: string) => {
        const replacerModule = await import(targetPath);
        config.output.debug('Imported replacerModule:', replacerModule);
        const replacerFunction = replacerModule.default;
        if (typeof replacerFunction == 'function') {
          config.replacers.push(replacerFunction);
          config.output.info(`Added replacer "${file}"`);
        } else {
          config.output.error(
            `Failed to import replacer "${file}", not in replacer format.`
          );
        }
      };

      // Look for replacer in cwd.
      const isRelativePath = !isAbsolute(file);
      const path = isRelativePath ? normalizePath(join(dir, file)) : file;

      if (existsSync(path)) {
        try {
          await tryImportReplacer(path);
          config.output.debug('Imported replacer:', path);
          continue;
        } catch {}
      }

      // Look for replacer in node_modules.
      if (isRelativePath) {
        for (const targetPath of node_modules.map((v) => join(dir, v, file))) {
          try {
            await tryImportReplacer(targetPath);
            config.output.debug('Imported replacer:', targetPath);
            continue;
          } catch {}
        }
      }

      config.output.error(`Failed to import replacer "${file}"`);
    }
  }
  config.output.debug('Loaded replacers:', config.replacers);
}

/**
 * replaceAlias replaces aliases in file.
 * @param {IConfig} config configuration
 * @param {string} file file to replace aliases in.
 * @param {boolean} resolveFullPath if tsc-alias should resolve the full path
 * @returns {Promise<boolean>} if something has been replaced.
 */
export async function replaceAlias(
  config: IConfig,
  file: string,
  resolveFullPath?: boolean,
  resolveFullExtension?: string
): Promise<boolean> {
  config.output.debug('Starting to replace file:', file);
  const code = await fsp.readFile(file, 'utf8');
  const tempCode = replaceAliasString(
    config,
    file,
    code,
    resolveFullPath,
    resolveFullExtension
  );

  if (code !== tempCode) {
    config.output.debug('replaced file with changes:', file);
    await fsp.writeFile(file, tempCode, 'utf8');
    return true;
  }
  config.output.debug('replaced file without changes:', file);
  return false;
}

/**
 * replaceAliasString replaces aliases in the given code content and returns the changed code.
 * @param {IConfig} config configuration
 * @param {string} file path of the file to replace aliases in.
 * @param {string} code contents of the file to replace aliases in.
 * @param {boolean} resolveFullPath if tsc-alias should resolve the full path
 * @returns {string} content of the file with any replacements possible applied.
 */
export function replaceAliasString(
  config: IConfig,
  file: string,
  code: string,
  resolveFullPath?: boolean,
  resolveFullExtension?: string
): string {
  config.replacers.forEach((replacer) => {
    code = replaceSourceImportPaths(code, file, (orig) =>
      replacer({
        orig,
        file,
        config
      })
    );
  });

  // Fully resolve all import paths (not just aliased ones)
  // *after* the aliases are resolved
  if (resolveFullPath) {
    code = resolveFullImportPaths(code, file, resolveFullExtension);
  }

  return code;
}

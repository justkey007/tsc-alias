/**
 * @file
 *
 * This file has all helperfunctions related to replacing.
 */

/** */
import { existsSync, promises as fsp } from 'fs';
import normalizePath from 'normalize-path';
import { Dir } from 'mylas';
import { join } from 'path';
import { IConfig, ReplacerOptions } from '../interfaces';
import { replaceSourceImportPaths, resolveFullImportPaths } from '../utils';

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
  const dir = process.cwd();
  const node_modules: string[] = Dir.nodeModules({ cwd: dir });

  // List of default replacers.
  const defaultReplacers: ReplacerOptions = {
    default: {
      enabled: true
    },
    BaseUrl: {
      enabled: true
    }
  };

  // List of all replacers.
  let merged: ReplacerOptions = {
    ...defaultReplacers,
    ...replacers
  };

  // Added replacers to list from command-line filepaths.
  cmdReplacers?.forEach((v) => {
    merged[v] = {
      enabled: true,
      file: v
    };
  });

  const entries = Object.entries(merged);
  for await (const replacer of entries) {
    if (replacer[1].enabled) {
      // Importing default replacers.
      if (Object.keys(defaultReplacers).includes(replacer[0])) {
        const replacerModule = await import(
          `../replacers/${replacer[0]}.replacer`
        );
        config.replacers.push(replacerModule.default);
      }

      const file = replacer[1]?.file;
      if (!file) {
        continue; // When file is undefined don't try to import.
      }
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
          continue;
        } catch {}
      }

      // Look for replacer in node_modules.
      for (const targetPath of node_modules.map((v) => join(dir, v, file))) {
        try {
          await tryImportReplacer(targetPath);
          continue;
        } catch {}
      }

      config.output.error(`Failed to import replacer "${file}"`);
    }
  }
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
  resolveFullPath?: boolean
): Promise<boolean> {
  const code = await fsp.readFile(file, 'utf8');
  const tempCode = replaceAliasString(config, file, code, resolveFullPath);

  if (code !== tempCode) {
    await fsp.writeFile(file, tempCode, 'utf8');
    return true;
  }
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
  resolveFullPath?: boolean
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
    code = resolveFullImportPaths(code, file);
  }

  return code;
}

import * as normalizePath from 'normalize-path';
import * as findNodeModulesPath from 'find-node-modules';
import { join } from 'path';
import { IConfig, ReplacerOptions } from '../interfaces';
import { existsSync, promises as fsp } from 'fs';
import { replaceSourceImportPaths, resolveFullImportPaths } from '../utils';

export async function importReplacers(
  config: IConfig,
  replacers: ReplacerOptions,
  cmdReplacers?: string[]
) {
  const dir = process.cwd();
  const node_modules: string[] = findNodeModulesPath({ cwd: dir });
  const defaultReplacers: ReplacerOptions = {
    default: {
      enabled: true
    },
    BaseUrl: {
      enabled: true
    }
  };

  let merged: ReplacerOptions = {
    ...defaultReplacers,
    ...replacers
  };

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
 * replaceFile replaces aliases in file.
 * @param config the tsc-alias config.
 * @param file file to replace aliases in.
 * @param resolveFullPath if tsc-alias should resolve the full path.
 * @returns if something has been replaced.
 */
export async function replaceFile(
  config: IConfig,
  file: string,
  resolveFullPath?: boolean
): Promise<boolean> {
  const code = await fsp.readFile(file, 'utf8');

  const tempCode = replaceAlias(config, file, code, resolveFullPath);

  if (code !== tempCode) {
    await fsp.writeFile(file, tempCode, 'utf8');
    return true;
  }
  return false;
}

/**
 * replaceAlias replaces aliases in string.
 * @param config the tsc-alias config.
 * @param file source filepath as resolve origin.
 * @param code the source code string.
 * @param resolveFullPath if tsc-alias should resolve the full path.
 * @returns the source code string with replaced aliases.
 */
export function replaceAlias(
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

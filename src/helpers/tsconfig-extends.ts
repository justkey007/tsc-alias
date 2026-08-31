/**
 * @file
 * Helpers for resolving tsconfig extends paths.
 */

import { existsSync, lstatSync } from 'fs';
import { Dir } from 'mylas';
import { dirname, join } from 'path';

function checkExtendsDirectory(targetPath: string): string | undefined {
  try {
    const stats = lstatSync(targetPath);
    if (stats.isDirectory() || stats.isSymbolicLink()) {
      return join(targetPath, 'tsconfig.json');
    }
  } catch {}

  const jsonCandidate = `${targetPath}.json`;
  if (existsSync(jsonCandidate)) {
    return jsonCandidate;
  }
  return undefined;
}

/**
 * resolveTsConfigExtendsPath resolves the path to the config file that is being inherited.
 * @param {string} ext the value of the extends field in the loaded config file.
 * @param {string} file file path to the config file that was loaded.
 * @returns {string} a file path to the config file that is being inherited.
 */
export function resolveTsConfigExtendsPath(
  ext: string,
  file: string
): string | undefined {
  const tsConfigDir = dirname(file);
  const node_modules: string[] = Dir.nodeModules({ cwd: tsConfigDir });
  const targetPaths = node_modules.map((v) => join(tsConfigDir, v, ext));

  for (const targetPath of targetPaths) {
    if (ext.endsWith('.json')) {
      if (existsSync(targetPath)) return targetPath;
      continue;
    }
    const resolved = checkExtendsDirectory(targetPath);
    if (resolved) return resolved;
  }
}

/**
 * normalizeTsConfigExtendsOption normalizes tsconfig extends option to a directly loadable path array
 * @param { string|string[] } ext
 * @param { string } file
 * @returns {string[]}
 */
export function normalizeTsConfigExtendsOption(
  ext: string | string[],
  file: string
): (string | undefined)[] {
  if (!ext) return [];
  const configDir = dirname(file);
  const exts = Array.isArray(ext) ? ext : [ext];

  return exts.map((e) => {
    if (e.startsWith('.')) {
      if (e.endsWith('.json')) {
        return join(configDir, e);
      }
      return join(configDir, `${e}.json`);
    }
    return resolveTsConfigExtendsPath(e, file);
  });
}

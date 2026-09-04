/**
 * @file
 * Helper functions for validating importable paths and file existence.
 */

import { existsSync, statSync } from 'fs';
import { join } from 'path';

export function pathExists(path: string, fileExtensions: string[]): boolean {
  if (existsSync(path)) return true;
  return fileExtensions.some((ext) => existsSync(`${path}.${ext}`));
}

export function isImportablePath(path: string, fileExtensions: string[]): boolean {
  const hasExtFile = fileExtensions.some((ext) => existsSync(`${path}.${ext}`));
  if (hasExtFile) return true;

  if (!existsSync(path)) return false;

  try {
    const stats = statSync(path);
    if (stats.isDirectory()) {
      const hasIndex = fileExtensions.some((ext) => existsSync(join(path, `index.${ext}`)));
      if (hasIndex) return true;
      return existsSync(join(path, 'package.json'));
    }
    return true;
  } catch {
    return false;
  }
}

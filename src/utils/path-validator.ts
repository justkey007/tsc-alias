/**
 * @file
 * Helper functions for validating importable paths and file existence.
 */

import { existsSync, statSync } from 'fs';
import { extname, join } from 'path';

export function getImportablePath(path: string, fileExtensions: string[]): string | null {
  const isValidPath = existsSync(path);
  if (!!extname(path) && isValidPath) {
    return path;
  }

  const targetFiles = fileExtensions.map((ext) => `${path}.${ext}`);
  for (const file of targetFiles) {
    if (existsSync(file)) return file;
  }

  if (!isValidPath) return null;

  const stats = statSync(path);
  if (stats.isDirectory()) {
    const indexFiles = fileExtensions.map((ext) => join(path, `index.${ext}`));
    for (const indexFile of indexFiles) {
      if (existsSync(indexFile)) return indexFile;
    }
    return null;
  }

  return path;
}

export function isImportablePath(path: string, fileExtensions: string[]): boolean {
  return !!getImportablePath(path, fileExtensions);
}

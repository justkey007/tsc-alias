/**
 * @file
 * Helper for scanning project files with glob pattern.
 */

import { sync } from 'globby';

export function buildScanPattern(posixOutput: string, inputGlob: string, declarationDir?: string): string[] {
  const globPattern = [`${posixOutput}/**/*.${inputGlob}`, `!${posixOutput}/**/node_modules`];

  if (declarationDir && declarationDir !== posixOutput) {
    const posixDeclDir = declarationDir.replace(/\\/g, '/').replace(/\/+$/g, '');
    if (posixDeclDir.startsWith(posixOutput)) {
      globPattern.push(`!${posixDeclDir}/**`);
    }
  }

  return globPattern;
}

export function scanProjectFiles(globPattern: string[]): string[] {
  return sync(globPattern, { dot: true, onlyFiles: true });
}

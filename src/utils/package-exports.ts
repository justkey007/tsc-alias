/**
 * @file
 * Helper to check whether an npm package manifest defines an exports field.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export function packageDefinesExports(packageRoot: string): boolean {
  const manifestPath = join(packageRoot, 'package.json');
  if (!existsSync(manifestPath)) return false;

  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
    return Object.prototype.hasOwnProperty.call(manifest, 'exports');
  } catch {
    return true;
  }
}

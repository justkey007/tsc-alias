/**
 * @file
 * Helper for resolving base paths when baseUrl points to a nested subfolder.
 */

import { normalize } from 'path';
import { IProjectConfig } from '../interfaces';
import normalizePath = require('normalize-path');

function isRootOrParentBaseUrl(normalizedBase: string): boolean {
  return !normalizedBase || normalizedBase === '.' || normalizedBase.startsWith('..');
}

/**
 * resolveNestedBaseUrlPath finds the correct output basepath when baseUrl
 * points to a nested subdirectory (e.g. "./src/jslib").
 * Returns undefined for root (".") and parent-relative ("../") baseUrls.
 */
export function resolveNestedBaseUrlPath(path: string, config: IProjectConfig): string | undefined {
  const normalizedBase = normalize(config.baseUrl);
  if (isRootOrParentBaseUrl(normalizedBase)) return undefined;

  const cleanBase = config.baseUrl.replace(/^(\.\/|\/)/, '');
  const strippedBase = cleanBase.replace(/^src\//, '');
  const candidates = [
    normalizePath(normalize(`${config.outDir}/${cleanBase}`)),
    normalizePath(normalize(`${config.outDir}/${strippedBase}`)),
    config.outDir!
  ];

  for (const candidate of candidates) {
    const fullCandidate = normalizePath(normalize(`${candidate}/${path}`));
    if (config.pathCache.existsResolvedAlias(fullCandidate)) {
      return candidate;
    }
  }

  return undefined;
}

/**
 * @file
 * Helper for reading and resolving TypeScript project references from tsconfig.json.
 */

import { existsSync } from 'fs';
import { Json } from 'mylas';
import { dirname, isAbsolute, join, resolve } from 'path';
import { IOutput } from '../interfaces';

export interface IReadConfigReferencesParams {
  configFile: string;
  output: IOutput;
}

interface IRawReference {
  path: string;
}

function resolveReferencePath(ref: string, configDir: string): string {
  const absolutePath = isAbsolute(ref) ? ref : resolve(configDir, ref);

  if (existsSync(join(absolutePath, 'tsconfig.json'))) {
    return join(absolutePath, 'tsconfig.json');
  }

  return absolutePath;
}

/**
 * readConfigReferences reads the `references` field from a tsconfig.json
 * and resolves them to absolute paths to their tsconfig.json files.
 * @param {IReadConfigReferencesParams} params configuration references parameters.
 * @returns {string[]} array of absolute paths to referenced tsconfig.json files.
 */
export function readConfigReferences(params: IReadConfigReferencesParams): string[] {
  const { configFile, output } = params;
  const raw = Json.loadS<{ references?: IRawReference[] }>(configFile, true);

  if (!raw.references || raw.references.length === 0) {
    output.debug('No references found in:', configFile);
    return [];
  }

  const configDir = dirname(configFile);
  const resolved: string[] = [];

  for (const ref of raw.references) {
    const refPath = resolveReferencePath(ref.path, configDir);
    if (!existsSync(refPath)) {
      output.debug('Referenced tsconfig not found, skipping:', refPath);
      continue;
    }
    output.debug('Resolved reference:', refPath);
    resolved.push(refPath);
  }

  return resolved;
}

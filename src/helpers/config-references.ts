/**
 * @file
 * Helper for reading and resolving TypeScript project references from tsconfig.json.
 */

import { IOutput } from '../interfaces';
import { loadProjectReferenceDetails } from './reference-path-resolver';

export interface IReadConfigReferencesParams {
  configFile: string;
  output?: IOutput;
}

/**
 * readConfigReferences reads the `references` field from a tsconfig.json
 * and resolves them to absolute paths to their tsconfig.json files.
 * @param {IReadConfigReferencesParams} params configuration references parameters.
 * @returns {string[]} array of absolute paths to referenced tsconfig.json files.
 */
export function readConfigReferences(params: IReadConfigReferencesParams): string[] {
  const { configFile, output } = params;
  const { hasReferences, references, missing } = loadProjectReferenceDetails(configFile);

  if (!hasReferences) {
    output?.debug('No references found in:', configFile);
    return [];
  }

  for (const refPath of missing) {
    output?.debug('Referenced tsconfig not found, skipping:', refPath);
  }
  for (const reference of references) {
    output?.debug('Resolved reference:', reference.configFile);
  }

  return references.map(({ configFile: referenceConfigFile }) => referenceConfigFile);
}

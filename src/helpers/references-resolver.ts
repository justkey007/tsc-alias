/**
 * @file
 * Recursive traversal of TypeScript project references graph.
 */

import { IOutput, ReplaceTscAliasPathsOptions } from '../interfaces';
import { readConfigReferences } from './config-references';

export interface IRunOnReferencesParams {
  configFile: string;
  options: ReplaceTscAliasPathsOptions;
  output: IOutput;
  visited: Set<string>;
}

/**
 * runOnReferences traverses the TypeScript project references graph recursively,
 * running alias replacement on each referenced project while avoiding cycles.
 * @param {IRunOnReferencesParams} params reference traversal parameters.
 */
export async function runOnReferences(params: IRunOnReferencesParams): Promise<void> {
  const { configFile, options, output, visited } = params;

  const references = readConfigReferences({ configFile, output });

  for (const refConfigFile of references) {
    if (visited.has(refConfigFile)) {
      output.debug('Cycle detected or already processed, skipping:', refConfigFile);
      continue;
    }

    visited.add(refConfigFile);
    output.debug('Processing reference:', refConfigFile);

    const { replaceTscAliasPaths } = await import('../alias-paths-replacer');
    await replaceTscAliasPaths({
      ...options,
      configFile: refConfigFile,
      followReferences: false,
      outDir: undefined,
      declarationDir: undefined,
      aliasTrie: undefined,
      output
    });

    await runOnReferences({
      configFile: refConfigFile,
      options,
      output,
      visited
    });
  }
}

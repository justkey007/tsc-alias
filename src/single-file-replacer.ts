/**
 * @file
 * Single file replacer helper for tsc-alias.
 */

import { prepareConfig, replaceAliasString } from './helpers';
import { IConfig, ReplaceTscAliasPathsOptions } from './interfaces';

export type SingleFileReplacer = (input: { fileContents: string; filePath: string }) => string;

/**
 * prepareSingleFileReplaceTscAliasPaths prepares a SingleFileReplacer.
 * @param {ReplaceTscAliasPathsOptions} options tsc-alias options.
 * @returns {Promise<SingleFileReplacer>} a SingleFileReplacer to use for replacing aliases in a single file.
 */
export async function prepareSingleFileReplaceTscAliasPaths(
  options: ReplaceTscAliasPathsOptions = {}
): Promise<SingleFileReplacer> {
  const config = await prepareConfig(options);
  let declarationConfig: IConfig | undefined;
  const declarationDir = options.declarationDir;

  if (declarationDir && declarationDir !== config.outPath) {
    declarationConfig = await prepareConfig({
      ...options,
      outDir: declarationDir,
      declarationDir: undefined,
      output: config.output,
      aliasTrie: undefined
    });
  }

  return ({ fileContents, filePath }) => {
    let activeConfig = config;
    const isDeclaration =
      declarationConfig && (filePath.endsWith('.d.ts') || (declarationDir && filePath.startsWith(declarationDir)));

    if (isDeclaration) {
      activeConfig = declarationConfig!;
    }

    return replaceAliasString(
      activeConfig,
      filePath,
      fileContents,
      options?.resolveFullPaths,
      options?.resolveFullExtension
    );
  };
}

/**
 * @file
 * Entry point for tsc-alias library and API exports.
 */

export { replaceTscAliasPaths } from './alias-paths-replacer';
export {
  AliasReplacer,
  AliasReplacerArguments,
  IConfig,
  IOutput,
  IProjectConfig,
  ReplaceTscAliasPathsOptions
} from './interfaces';
export { prepareSingleFileReplaceTscAliasPaths, SingleFileReplacer } from './single-file-replacer';

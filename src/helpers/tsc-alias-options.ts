/**
 * @file
 * Helper functions for resolving tsc-alias specific configuration.
 */

import { join } from 'path';
import { ITSCAliasConfig, ITSConfig } from '../interfaces';

export interface IApplyTscAliasOptionsParams {
  config: ITSConfig;
  tscAliasConfig?: ITSCAliasConfig;
  configDir: string;
}

export function applyTscAliasOptions(params: IApplyTscAliasOptionsParams): void {
  const { config, tscAliasConfig, configDir } = params;
  if (tscAliasConfig?.replacers) config.replacers = tscAliasConfig.replacers;
  if (tscAliasConfig?.resolveFullPaths) {
    config.resolveFullPaths = tscAliasConfig.resolveFullPaths;
  }
  if (tscAliasConfig?.verbose) config.verbose = tscAliasConfig.verbose;
  config.fileExtensions = tscAliasConfig?.fileExtensions ?? {};

  const replacerFile = config.replacers?.pathReplacer?.file;
  if (replacerFile) {
    config.replacers!.pathReplacer.file = join(configDir, replacerFile);
  }
}

/**
 * @file
 * This file has all helper functions related to configuration.
 */

import { existsSync } from 'fs';
import { IConfig, ReplaceTscAliasPathsOptions } from '../interfaces';
import { Output } from '../utils';
import { buildProjectConfig } from './config-builder';
import { resolveConfigFilePath } from './project-config';
import { importReplacers } from './replacers';

export { loadConfig } from './config-loader';
export {
  normalizeTsConfigExtendsOption,
  resolveTsConfigExtendsPath
} from './tsconfig-extends';

/**
 * prepareConfig prepares a IConfig object for tsc-alias to be used.
 * @param {ReplaceTscAliasPathsOptions} options options that are used to prepare a config object.
 * @returns {Promise<IConfig>} a promise of a IConfig object.
 */
export async function prepareConfig(
  options: ReplaceTscAliasPathsOptions
): Promise<IConfig> {
  const output = options.output ?? new Output(options.verbose, options.debug);
  const configFile = resolveConfigFilePath(options.configFile);
  output.assert(existsSync(configFile), `Invalid file path => ${configFile}`);

  const { config, replacers } = buildProjectConfig({
    configFile,
    output,
    options
  });

  await importReplacers(config, replacers!, options.replacers);
  return config;
}

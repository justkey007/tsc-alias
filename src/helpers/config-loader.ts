/**
 * @file
 * Loader helper for tsconfig and tsc-alias configurations.
 */

import { existsSync } from 'fs';
import { parseTsconfig, TsConfigJsonResolved } from 'get-tsconfig';
import { Json } from 'mylas';
import { dirname } from 'path';
import { IOutput, ITSCAliasConfig, ITSConfig } from '../interfaces';
import { applyCompilerOptions } from './compiler-options';
import { applyTscAliasOptions } from './tsc-alias-options';

export interface ILoadConfigParams {
  file: string;
  output: IOutput;
  baseConfigDir?: string | null;
}

/**
 * loadConfig loads a config file from fs.
 * @param {ILoadConfigParams} params configuration loader parameters.
 * @returns {ITSConfig} an ITSConfig object.
 */
export function loadConfig(params: ILoadConfigParams): ITSConfig {
  const { file, output, baseConfigDir = null } = params;

  if (!existsSync(file)) output.error(`File ${file} not found`, true);
  output.debug('Loading config file:', file);

  const tsConfig = parseTsconfig(file);
  tsConfig.compilerOptions = {
    rootDir: '.',
    ...(tsConfig.compilerOptions ?? {})
  };
  const baseTsConfig = Json.loadS<TsConfigJsonResolved>(file, true);
  const { compilerOptions = {}, 'tsc-alias': tscAliasConfig } =
    tsConfig as TsConfigJsonResolved & { 'tsc-alias': ITSCAliasConfig };

  const configDir = dirname(file);
  output.debug('configDir', configDir);
  const config: ITSConfig = {};

  applyCompilerOptions({
    config,
    compilerOptions,
    baseTsConfig,
    configDir,
    baseConfigDir
  });

  applyTscAliasOptions({ config, tscAliasConfig, configDir });

  output.debug('loaded config (from file):', config);
  return config;
}

/**
 * @file
 * Builder helper for assembling full configuration pipeline.
 */

import { IConfig, IOutput, ReplaceTscAliasPathsOptions } from '../interfaces';
import { loadConfig } from './config-loader';
import {
  applyConfigOverrides,
  resolveEffectiveOutDir
} from './config-overrides';
import { createFinalConfig, createProjectConfig } from './project-config';

export interface IBuildProjectConfigParams {
  configFile: string;
  output: IOutput;
  options: ReplaceTscAliasPathsOptions;
}

export function buildProjectConfig(params: IBuildProjectConfigParams): {
  config: IConfig;
  replacers: any;
} {
  const { configFile, output, options } = params;
  const loaded = loadConfig({ file: configFile, output });
  const {
    baseUrl = '',
    outDir,
    declarationDir,
    paths,
    replacers,
    resolveFullPaths,
    verbose,
    fileExtensions
  } = loaded;

  applyConfigOverrides({
    options,
    output,
    fileExtensions,
    resolveFullPaths,
    verbose
  });

  const effectiveOutDir = resolveEffectiveOutDir({
    options,
    outDir,
    declarationDir,
    output
  });
  const projectConfig = createProjectConfig({
    configFile,
    baseUrl,
    outDir: effectiveOutDir,
    options,
    fileExtensions
  });
  output.debug('loaded project config:', projectConfig);

  const config = createFinalConfig({
    projectConfig,
    output,
    paths,
    aliasTrie: options.aliasTrie
  });
  output.debug('loaded full config:', config);

  return { config, replacers };
}

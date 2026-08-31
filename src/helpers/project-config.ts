/**
 * @file
 * Helper functions for creating project configuration objects.
 */

import { basename, dirname, isAbsolute, resolve } from 'path';
import {
  Alias,
  FileExtensions,
  IConfig,
  IOutput,
  IProjectConfig,
  PathLike,
  ReplaceTscAliasPathsOptions
} from '../interfaces';
import { PathCache, TrieNode } from '../utils';
import normalizePath = require('normalize-path');

export interface ICreateProjectConfigParams {
  configFile: string;
  baseUrl: string;
  outDir: string;
  options: ReplaceTscAliasPathsOptions;
  fileExtensions?: Partial<FileExtensions>;
}

export interface ICreateFinalConfigParams {
  projectConfig: IProjectConfig;
  output: IOutput;
  paths?: PathLike;
  aliasTrie?: TrieNode<Alias>;
}

export function resolveConfigFilePath(configFile?: string): string {
  if (!configFile) return resolve(process.cwd(), 'tsconfig.json');
  if (!isAbsolute(configFile)) return resolve(process.cwd(), configFile);
  return configFile;
}

export function createProjectConfig(params: ICreateProjectConfigParams): IProjectConfig {
  const { configFile, baseUrl, outDir, options, fileExtensions } = params;
  const configDir: string = normalizePath(dirname(configFile));

  return {
    configFile,
    baseUrl,
    outDir,
    configDir,
    outPath: outDir,
    confDirParentFolderName: basename(configDir),
    hasExtraModule: false,
    configDirInOutPath: null,
    relConfDirPathInOutPath: null,
    pathCache: new PathCache(!options.watch, fileExtensions?.outputCheck),
    inputGlob: fileExtensions?.inputGlob || '{mjs,cjs,js,jsx,d.{mts,cts,ts,tsx}}'
  };
}

export function createFinalConfig(params: ICreateFinalConfigParams): IConfig {
  const { projectConfig, output, paths, aliasTrie } = params;
  return {
    ...projectConfig,
    output,
    aliasTrie: aliasTrie ?? TrieNode.buildAliasTrie(projectConfig, paths),
    replacers: []
  };
}

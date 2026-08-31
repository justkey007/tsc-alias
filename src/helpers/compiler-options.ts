/**
 * @file
 * Helper functions for resolving tsconfig compiler options.
 */

import { ITSConfig } from '../interfaces';
import {
  applyBaseConfigDirToPaths,
  replaceConfigDirPlaceholder,
  resolveDirectoryPath,
  resolvePathsWithoutBaseUrl
} from './config-paths';

export interface IApplyCompilerOptionsParams {
  config: ITSConfig;
  compilerOptions: any;
  baseTsConfig: any;
  configDir: string;
  baseConfigDir: string | null;
}

export function applyCompilerOptions(
  params: IApplyCompilerOptionsParams
): void {
  const { config, compilerOptions, baseTsConfig, configDir, baseConfigDir } =
    params;
  const { baseUrl, outDir, declarationDir, paths, rootDir } = compilerOptions;

  const effectiveOutDir = outDir || baseTsConfig?.compilerOptions?.outDir;
  if (effectiveOutDir) {
    let rawOutDir = effectiveOutDir;
    if (baseConfigDir !== null) {
      rawOutDir = outDir!;
    }
    config.outDir = resolveDirectoryPath(rawOutDir, configDir, baseConfigDir);
  }

  if (paths) {
    if (baseConfigDir !== null) {
      config.paths = applyBaseConfigDirToPaths(paths, baseConfigDir);
    } else {
      config.paths = paths;
    }
  }

  if (baseUrl) {
    if (baseConfigDir !== null) {
      config.baseUrl = replaceConfigDirPlaceholder(baseUrl, baseConfigDir);
    } else {
      config.baseUrl = baseUrl;
    }
  } else if (config.paths && Object.keys(config.paths).length !== 0) {
    resolvePathsWithoutBaseUrl({
      paths: config.paths,
      configDir,
      rootDir: rootDir!
    });
  }

  if (declarationDir) {
    config.declarationDir = resolveDirectoryPath(
      declarationDir,
      configDir,
      baseConfigDir
    );
  }
}

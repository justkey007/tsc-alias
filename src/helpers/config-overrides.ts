/**
 * @file
 * Helper functions for applying runtime options overrides to loaded configuration.
 */

import { FileExtensions, IOutput, ReplaceTscAliasPathsOptions } from '../interfaces';

export interface IApplyConfigOverridesParams {
  options: ReplaceTscAliasPathsOptions;
  output: IOutput;
  fileExtensions?: Partial<FileExtensions>;
  resolveFullPaths?: boolean;
  verbose?: boolean;
}

export interface IResolveEffectiveOutDirParams {
  options: ReplaceTscAliasPathsOptions;
  outDir?: string;
  declarationDir?: string;
  output: IOutput;
}

export function applyConfigOverrides(params: IApplyConfigOverridesParams): void {
  const { options, output, fileExtensions, resolveFullPaths, verbose } = params;

  if (options?.fileExtensions?.inputGlob && fileExtensions) {
    fileExtensions.inputGlob = options.fileExtensions.inputGlob;
  }
  if (options?.fileExtensions?.outputCheck && fileExtensions) {
    fileExtensions.outputCheck = options.fileExtensions.outputCheck;
  }

  output.verbose = verbose!;
  if (options.resolveFullPaths || resolveFullPaths) {
    output.debug('resolveFullPaths is active');
    options.resolveFullPaths = true;
  }
}

export function resolveEffectiveOutDir(params: IResolveEffectiveOutDirParams): string {
  const { options, outDir, declarationDir, output } = params;
  const effectiveOutDir = options.outDir ?? outDir;
  if (declarationDir && effectiveOutDir !== declarationDir) {
    options.declarationDir ??= declarationDir;
  }
  output.assert(effectiveOutDir, 'compilerOptions.outDir is not set');
  return effectiveOutDir!;
}

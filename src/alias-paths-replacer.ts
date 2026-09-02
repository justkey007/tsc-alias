/**
 * @file
 * Main runner for replacing tsc alias paths across project files.
 */

import { pLimit } from 'plimit-lit';
import { buildScanPattern, scanProjectFiles } from './alias-scanner';
import { prepareConfig, replaceAlias } from './helpers';
import { ReplaceTscAliasPathsOptions } from './interfaces';
import { setupFileWatcher } from './watcher';

const OpenFilesLimit = pLimit(500);

/**
 * replaceTscAliasPaths replaces the aliases in the project.
 * @param {ReplaceTscAliasPathsOptions} options tsc-alias options.
 */
export async function replaceTscAliasPaths(options: ReplaceTscAliasPathsOptions = {}): Promise<void> {
  const config = await prepareConfig(options);
  const output = config.output;

  const posixOutput = config.outPath.replace(/\\/g, '/').replace(/\/+$/g, '');
  const globPattern = buildScanPattern(posixOutput, config.inputGlob, options.declarationDir);

  output.debug('Search pattern:', globPattern);
  const files = scanProjectFiles(globPattern);
  output.debug('Found files:', files);

  const replaceList = await Promise.all(
    files.map((file) =>
      OpenFilesLimit(() => replaceAlias(config, file, options?.resolveFullPaths, options?.resolveFullExtension))
    )
  );

  output.info(`${replaceList.filter(Boolean).length} files were affected!`);

  if (options.watch) {
    setupFileWatcher({
      config,
      options,
      globPattern,
      onRestart: replaceTscAliasPaths
    });
  }

  if (options.declarationDir && options.declarationDir !== config.outPath) {
    await replaceTscAliasPaths({
      ...options,
      outDir: options.declarationDir,
      declarationDir: undefined,
      output: config.output,
      aliasTrie: undefined
    });
  }
}

/**
 * @file
 * Main runner for replacing tsc alias paths across project files.
 */

import { pLimit } from 'plimit-lit';
import { prepareConfig, replaceAlias } from './helpers';
import { buildScanPattern, scanProjectFiles } from './helpers/alias-scanner';
import { ReplaceTscAliasPathsOptions } from './interfaces';
import { setupFileWatcher } from './watcher';

const OpenFilesLimit = pLimit(500);

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
    setupFileWatcher({ config, options, globPattern, onRestart: replaceTscAliasPaths });
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

  if (options.followReferences) {
    const { runOnReferences } = await import('./helpers/references-resolver');
    await runOnReferences({
      configFile: config.configFile,
      options,
      output: config.output,
      visited: new Set([config.configFile])
    });
  }
}

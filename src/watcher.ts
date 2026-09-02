/**
 * @file
 * File watcher helper for tsc-alias watch mode.
 */

import { watch } from 'chokidar';
import { replaceAlias } from './helpers';
import { IConfig, ReplaceTscAliasPathsOptions } from './interfaces';

export interface ISetupFileWatcherParams {
  config: IConfig;
  options: ReplaceTscAliasPathsOptions;
  globPattern: string[];
  onRestart: (options: ReplaceTscAliasPathsOptions) => void;
}

export function setupFileWatcher(params: ISetupFileWatcherParams): void {
  const { config, options, globPattern, onRestart } = params;
  const output = config.output;

  output.verbose = true;
  output.info('[Watching for file changes...]');

  const filesWatcher = watch(globPattern);
  const tsconfigWatcher = watch(config.configFile);
  const onFileChange = async (file: string) => await replaceAlias(config, file, options?.resolveFullPaths);

  filesWatcher.on('add', onFileChange);
  filesWatcher.on('change', onFileChange);

  tsconfigWatcher.on('change', () => {
    output.clear();
    filesWatcher.close();
    tsconfigWatcher.close();
    onRestart(options);
  });
}

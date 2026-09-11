/**
 * @file
 *
 * This file has all helperfunctions related to replacing.
 */

/** */
import { Dir } from 'mylas';
import { importReplacerEntry } from './replacer-entry';
import { getDefaultReplacers, mergeReplacers } from './replacer-options';
import { IImportReplacersParams } from './replacer-params';
export { replaceAlias, replaceAliasString } from './replace-alias';
export { IImportReplacersParams, IReplaceAliasParams, IReplaceAliasStringParams } from './replacer-params';

/**
 * importReplacers imports replacers for tsc-alias to use.
 * @param {IImportReplacersParams} params replacer loading parameters.
 */
export async function importReplacers(params: IImportReplacersParams) {
  const { config, replacers, cmdReplacers } = params;
  config.output.debug('Started loading replacers');
  const cwd = process.cwd();
  const nodeModules: string[] = Dir.nodeModules({ cwd });
  config.output.debug('Found node_modules:', nodeModules);

  const defaultReplacers = getDefaultReplacers(config.baseUrl);
  config.output.debug('Added replacers to list from command-line filepaths:', cmdReplacers);
  const merged = mergeReplacers({
    defaultReplacers,
    replacers,
    cmdReplacers
  });

  config.output.debug('Reading replacers config');
  const entries = Object.entries(merged);
  for await (const entry of entries) {
    await importReplacerEntry({
      config,
      defaultReplacers,
      entry,
      cwd,
      nodeModules
    });
  }
  config.output.debug('Loaded replacers:', config.replacers);
}

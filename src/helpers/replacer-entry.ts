import { IConfig, ReplacerOptions } from '../interfaces';
import { loadReplacer } from './replacer-loader';

type ReplacerOption = ReplacerOptions[string];

export interface IReplacerEntryParams {
  config: IConfig;
  defaultReplacers: ReplacerOptions;
  entry: [string, ReplacerOption];
  cwd: string;
  nodeModules: string[];
}

function isDefaultReplacer(params: Pick<IReplacerEntryParams, 'defaultReplacers' | 'entry'>): boolean {
  const { defaultReplacers, entry } = params;
  const [name] = entry;

  return Object.keys(defaultReplacers).includes(name);
}

async function importDefaultReplacer(params: Pick<IReplacerEntryParams, 'config' | 'entry'>): Promise<void> {
  const { config, entry } = params;
  const [name] = entry;

  // Importing default replacers.
  config.output.debug('Loading default replacer:', entry);
  const replacerModule = await import(`../replacers/${name}.replacer`);
  config.replacers.push(replacerModule.default);
}

export async function importReplacerEntry(params: IReplacerEntryParams): Promise<void> {
  const { config, defaultReplacers, entry, cwd, nodeModules } = params;
  const [, options] = entry;

  if (!options.enabled) {
    return;
  }

  if (isDefaultReplacer({ defaultReplacers, entry })) {
    await importDefaultReplacer({ config, entry });
  }

  const file = options?.file;
  if (!file) {
    config.output.debug('Replacer has no file:', entry);
    return; // When file is undefined don't try to import.
  }

  const isLoaded = await loadReplacer({
    config,
    file,
    cwd,
    nodeModules
  });

  if (!isLoaded) {
    config.output.error(`Failed to import replacer "${file}"`);
  }
}

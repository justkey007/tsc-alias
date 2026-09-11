import { existsSync } from 'fs';
import { isAbsolute, join } from 'path';
import { IConfig } from '../interfaces';
import normalizePath = require('normalize-path');

export interface ILoadReplacerParams {
  config: IConfig;
  file: string;
  cwd: string;
  nodeModules: string[];
}

interface IImportReplacerParams extends Pick<ILoadReplacerParams, 'config' | 'file'> {
  targetPath: string;
}

interface ITryImportReplacerParams extends ILoadReplacerParams {
  targetPath: string;
}

async function importReplacer(params: IImportReplacerParams) {
  const { config, file, targetPath } = params;
  const replacerModule = await import(targetPath);
  config.output.debug('Imported replacerModule:', replacerModule);

  const replacerFunction = replacerModule.default;
  if (typeof replacerFunction == 'function') {
    config.replacers.push(replacerFunction);
    config.output.info(`Added replacer "${file}"`);
    return;
  }

  config.output.error(`Failed to import replacer "${file}", not in replacer format.`);
}

async function tryImportReplacer(params: ITryImportReplacerParams): Promise<boolean> {
  const { config, targetPath } = params;

  try {
    await importReplacer(params);
    config.output.debug('Imported replacer:', targetPath);
    return true;
  } catch {}

  return false;
}

export async function loadReplacer(params: ILoadReplacerParams): Promise<boolean> {
  const { cwd, file, nodeModules } = params;
  const isRelativePath = !isAbsolute(file);
  const path = isRelativePath ? normalizePath(join(cwd, file)) : file;

  // Look for replacer in cwd.
  if (existsSync(path) && (await tryImportReplacer({ ...params, targetPath: path }))) {
    return true;
  }

  if (!isRelativePath) {
    return false;
  }

  // Look for replacer in node_modules.
  for (const nodeModule of nodeModules) {
    const targetPath = join(cwd, nodeModule, file);
    if (await tryImportReplacer({ ...params, targetPath })) {
      return true;
    }
  }

  return false;
}

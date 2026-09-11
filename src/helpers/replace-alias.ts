import { promises as fsp } from 'fs';
import { replaceSourceImportPaths, resolveFullImportPaths } from '../utils';
import { IReplaceAliasParams, IReplaceAliasStringParams } from './replacer-params';

/**
 * replaceAlias replaces aliases in file.
 * @param {IReplaceAliasParams} params alias replacement parameters.
 * @returns {Promise<boolean>} if something has been replaced.
 */
export async function replaceAlias(params: IReplaceAliasParams): Promise<boolean> {
  const { config, file, resolveFullPath, resolveFullExtension } = params;
  config.output.debug('Starting to replace file:', file);
  const code = await fsp.readFile(file, 'utf8');
  const tempCode = replaceAliasString({
    config,
    file,
    code,
    resolveFullPath,
    resolveFullExtension
  });

  if (code !== tempCode) {
    config.output.debug('replaced file with changes:', file);
    await fsp.writeFile(file, tempCode, 'utf8');
    return true;
  }

  config.output.debug('replaced file without changes:', file);
  return false;
}

/**
 * replaceAliasString replaces aliases in the given code content and returns the changed code.
 * @param {IReplaceAliasStringParams} params alias replacement parameters.
 * @returns {string} content of the file with any replacements possible applied.
 */
export function replaceAliasString(params: IReplaceAliasStringParams): string {
  const { config, file, resolveFullPath, resolveFullExtension } = params;
  let { code } = params;
  config.replacers.forEach((replacer) => {
    code = replaceSourceImportPaths(code, file, (orig) =>
      replacer({
        orig,
        file,
        config
      })
    );
  });

  // Fully resolve all import paths (not just aliased ones)
  // *after* the aliases are resolved
  if (resolveFullPath) {
    code = resolveFullImportPaths(code, file, resolveFullExtension);
  }

  return code;
}

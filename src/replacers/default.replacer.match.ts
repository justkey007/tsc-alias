/**
 * @file
 * Helper functions for matching alias prefixes and stripping prefixes.
 */

import { Alias } from '../interfaces';

export interface IIsMatchingAliasParams {
  requiredModule: string;
  alias: Alias;
}

function escapeSpecialChars(str: string): string {
  return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * Checks if a required module matches the given alias definition.
 */
export function isMatchingAlias(params: IIsMatchingAliasParams): boolean {
  const { requiredModule, alias } = params;

  if (alias.shouldPrefixMatchWildly) {
    // If the alias is like alias*, requiredModule must be more than just alias
    return requiredModule.startsWith(alias.prefix) && requiredModule !== alias.prefix;
  }

  // Exact match e.g. require('alias') or subpath e.g. require('alias/path')
  if (requiredModule === alias.prefix) {
    return true;
  }
  return requiredModule.startsWith(`${alias.prefix}/`);
}

/**
 * Removes the alias prefix and any trailing file extensions from module path.
 */
export function removeAliasPrefix(requiredModule: string, alias: Alias): string {
  const escapedPrefix = escapeSpecialChars(alias.prefix);
  const regex = new RegExp(`(?:^${escapedPrefix})|(?:\\.(js|ts|json)$)`, 'g');
  return requiredModule.replace(regex, '');
}

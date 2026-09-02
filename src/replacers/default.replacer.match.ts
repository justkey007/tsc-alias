/**
 * @file
 * Helper functions for matching alias prefixes and extracting wildcards.
 */

import { Alias } from '../interfaces';
import { matchWildcard } from '../utils';

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
  const hasWildcard = alias.hasWildcard ?? alias.shouldPrefixMatchWildly;
  const suffix = alias.suffix ?? '';

  const { matched } = matchWildcard({
    pattern: {
      prefix: alias.prefix,
      suffix,
      hasWildcard
    },
    text: requiredModule
  });

  return matched;
}

export function extractWildcardValue(requiredModule: string, alias: Alias): string {
  const hasWildcard = alias.hasWildcard ?? alias.shouldPrefixMatchWildly;
  const suffix = alias.suffix ?? '';

  const { starValue } = matchWildcard({
    pattern: {
      prefix: alias.prefix,
      suffix,
      hasWildcard
    },
    text: requiredModule
  });

  return starValue;
}

export function removeAliasPrefix(requiredModule: string, alias: Alias): string {
  const starVal = extractWildcardValue(requiredModule, alias);
  if (starVal) return starVal;

  const escapedPrefix = escapeSpecialChars(alias.prefix);
  const regex = new RegExp(`(?:^${escapedPrefix})|(?:\\.(?:[cm]?[jt]sx?|json)$)`, 'g');
  return requiredModule.replace(regex, '');
}

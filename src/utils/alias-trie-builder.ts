/**
 * @file
 * Builder helper for populating alias Trie structure.
 */

import { findBasePathOfAlias } from '../helpers';
import { Alias, IProjectConfig, PathLike } from '../interfaces';
import { normalizeAliasPath } from './alias-path-normalizer';
import { parseWildcardPattern } from './pattern-matcher';

export interface ITrieContainer<T> {
  add(name: string, data: T): void;
}

export interface INormalizeAliasEntryParams {
  aliasKey: string;
  targetPaths: string[];
  config: IProjectConfig;
}

export interface IBuildAliasTrieParams<T extends ITrieContainer<Alias>> {
  config: IProjectConfig;
  paths?: PathLike;
  trie: T;
}

interface IRawAliasData {
  prefix: string;
  suffix: string;
  hasWildcard: boolean;
  shouldPrefixMatchWildly: boolean;
  paths: string[];
}

/**
 * Normalizes alias keys and paths.
 */
export function normalizeAliasEntry(params: INormalizeAliasEntryParams): IRawAliasData {
  const { aliasKey, targetPaths, config } = params;
  const keyPattern = parseWildcardPattern(aliasKey);
  const prefix = keyPattern.prefix;
  const suffix = keyPattern.suffix;
  const hasWildcard = keyPattern.hasWildcard;
  const shouldPrefixMatchWildly = hasWildcard && suffix === '';
  const paths = targetPaths.map((path) => normalizeAliasPath({ path, config }));

  return { prefix, suffix, hasWildcard, shouldPrefixMatchWildly, paths };
}

/**
 * Builds and populates an alias trie in two phases.
 */
export function buildAliasTrie<T extends ITrieContainer<Alias>>(params: IBuildAliasTrieParams<T>): T {
  const { config, paths, trie } = params;
  if (!paths) return trie;

  const normalizedAliases = Object.keys(paths).map((aliasKey) =>
    normalizeAliasEntry({ aliasKey, targetPaths: paths[aliasKey], config })
  );

  for (const alias of normalizedAliases) {
    trie.add(alias.prefix, {
      ...alias,
      paths: alias.paths.map(findBasePathOfAlias(config))
    });
  }

  return trie;
}

/**
 * @file
 *
 * The TrieNode class is a prefix tree.
 * [Trie](https://en.wikipedia.org/wiki/Trie)
 *
 * This is a tree data structure used for locating specific keys
 * from within a set. The links between nodes defined by individual characters.
 * A node's position in the trie defines the key with which it is associated.
 * This distributes the value of each key across the data structure,
 * and means that not every node necessarily has an associated value.
 */

/** */
import { isAbsolute, normalize, relative, resolve } from 'path';
import { findBasePathOfAlias, relativeOutPathToConfigDir } from '../helpers';
import { Alias, IProjectConfig, PathLike } from '../interfaces';

export class TrieNode<T> {
  private children: Map<string, TrieNode<T>>;
  public data: T | null;

  constructor() {
    this.children = new Map();
    this.data = null;
  }

  /**
   * add adds an alias to the prefix tree.
   * @param {string} name the prefix of the alias.
   * @param {T} data the alias data.
   * @returns {void}.
   */
  public add(name: string, data: T): void {
    if (name.length <= 0) return;
    const node = this.children.has(name[0])
      ? this.children.get(name[0])
      : new TrieNode<T>();
    if (name.length == 1) {
      node.data = data;
    } else {
      node.add(name.substring(1), data);
    }
    this.children.set(name[0], node);
  }

  /**
   * search searches the prefix tree for the most correct alias data for a given prefix.
   * @param {string} name the prefix to search for.
   * @returns {T | null} the alias data or null.
   */
  public search(name: string): T | null {
    if (name.length <= 0) return null;

    const node = this.children.get(name[0]);
    return node
      ? name.length == 1
        ? node.data
        : node.search(name.substring(1)) ?? node.data
      : this.data;
  }

  /**
   * buildAliasTrie builds an alias trie
   * @param {IProjectConfig} config projectConfig is an object with config details
   * @param {PathLike} paths optional the paths to put into the trie
   * @returns {TrieNode<Alias>} a TrieNode with the paths/aliases inside
   */
  static buildAliasTrie(
    config: IProjectConfig,
    paths?: PathLike
  ): TrieNode<Alias> {
    const aliasTrie = new this<Alias>();
    if (paths) {
      Object.keys(paths)
        .map((alias) => {
          return {
            shouldPrefixMatchWildly: alias.endsWith('*'),
            prefix: alias.replace(/\*$/, ''),
            // Normalize paths.
            paths: paths[alias].map((path) => {
              path = path.replace(/\*$/, '');

              const dotIndex = path.lastIndexOf('.');
              const beforeDot = path.slice(0, dotIndex);
              const afterDot = path.slice(dotIndex);

              // Refuse to normalize extensions for paths that look like "a.b/c" or "a.b\c".
              // Even if the current system is Linux the original author could've written a Windows path.
              if (!afterDot.includes('/') && !afterDot.includes('\\')) {
                const extension = afterDot;
                let normalizedExtension = afterDot;
                if (!isDTS(extension)) {
                  normalizedExtension = extension.replace(
                    /\.([mc])?ts(x)?$/,
                    '.$1js$2'
                  );
                }

                path = beforeDot + normalizedExtension;
              }

              if (isAbsolute(path)) {
                path = relative(
                  resolve(config.configDir, config.baseUrl),
                  path
                );
              }

              if (
                normalize(path).includes('..') &&
                !config.configDirInOutPath
              ) {
                relativeOutPathToConfigDir(config);
              }

              return path;
            })
          };
        })
        .forEach((alias) => {
          if (alias.prefix) {
            // Add all aliases to AliasTrie.
            aliasTrie.add(alias.prefix, {
              ...alias,
              // Find basepath of aliases.
              paths: alias.paths.map(findBasePathOfAlias(config))
            });
          }
        });
    }
    return aliasTrie;
  }
}

function isDTS(extension: string): boolean {
  return /\.d(\..*)?\.[mc]?ts(x)?$/.test(extension);
}

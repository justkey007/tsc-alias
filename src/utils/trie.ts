/**
 * @file
 *
 * The TrieNode class is a prefix tree.
 * [Trie](https://en.wikipedia.org/wiki/Trie)
 */

import { Alias, IProjectConfig, PathLike } from '../interfaces';
import { buildAliasTrie, ITrieContainer } from './alias-trie-builder';

export class TrieNode<T> implements ITrieContainer<T> {
  private children: Map<string, TrieNode<T>>;
  public data: T | null;

  constructor() {
    this.children = new Map();
    this.data = null;
  }

  private getOrCreateChild(char: string): TrieNode<T> {
    const existing = this.children.get(char);
    if (existing) return existing;
    const child = new TrieNode<T>();
    this.children.set(char, child);
    return child;
  }

  /**
   * add adds an alias to the prefix tree.
   * @param {string} name the prefix of the alias.
   * @param {T} data the alias data.
   * @returns {void}.
   */
  public add(name: string, data: T): void {
    const char = name[0] ?? '';
    const node = this.getOrCreateChild(char);
    if (name.length <= 1) {
      node.data = data;
      return;
    }
    node.add(name.substring(1), data);
  }

  /**
   * search searches the prefix tree for the most correct alias data for a given prefix.
   * @param {string} name the prefix to search for.
   * @returns {T | null} the alias data or null.
   */
  public search(name: string): T | null {
    if (name.length <= 0) return null;
    const char = name[0];
    const node = this.children.get(char) ?? this.children.get('');
    if (!node) return this.data;
    if (name.length === 1) return node.data;
    return node.search(name.substring(1)) ?? node.data;
  }

  /**
   * buildAliasTrie builds an alias trie
   * @param {IProjectConfig} config projectConfig is an object with config details
   * @param {PathLike} paths optional the paths to put into the trie
   * @returns {TrieNode<Alias>} a TrieNode with the paths/aliases inside
   */
  public static buildAliasTrie(config: IProjectConfig, paths?: PathLike): TrieNode<Alias> {
    const trie = new TrieNode<Alias>();
    return buildAliasTrie({ config, paths, trie });
  }
}

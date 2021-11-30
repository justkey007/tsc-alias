/**
 * TrieNode is a prefix tree.
 * [Trie](https://en.wikipedia.org/wiki/Trie)
 */
export class TrieNode<T> {
  private children: Map<string, TrieNode<T>>;
  public data: T | null;

  constructor() {
    this.children = new Map();
    this.data = null;
  }

  /**
   * add adds an alias to the prefix tree.
   * @param name the prefix of the alias.
   * @param data the alias data.
   * @returns void.
   */
  public add(name: string, data: T) {
    if (name.length <= 0) return;
    const node = this.children.has(name[0])
      ? this.children.get(name[0])!
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
   * @param name the prefix to search for.
   * @returns the alias data or null.
   */
  public search(name: string): T | null {
    if (name.length <= 0) return null;

    const node = this.children.get(name[0]);
    if (node) {
      if (name.length == 1) {
        return node.data;
      } else {
        const result = node.search(name.substring(1));
        return result ? result : node.data;
      }
    } else {
      return this.data;
    }
  }
}

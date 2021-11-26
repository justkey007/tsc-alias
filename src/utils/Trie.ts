export class TrieNode<T> {
    private childeren: Map<string, TrieNode<T>>;
    public data: T | null;

    constructor() {
        this.childeren = new Map();
        this.data = null;
    }

    public add(name: string, data: T) {
        if (name.length <= 0) return;
        const node = this.childeren.has(name[0])
            ? this.childeren.get(name[0])!
            : new TrieNode<T>();
        if (name.length == 1) {
            node.data = data;
        } else {
            node.add(name.substring(1), data);
        }
        this.childeren.set(name[0], node);
    }

    public search(name: string): T | null {
        if (name.length <= 0) return null;

        const node = this.childeren.get(name[0]);
        if (node) {
            if (name.length == 1) {
                return node.data;                
            } else {
                const result = node.search(name.substring(1));
                return result? result: node.data;
            }
        } else {
            return this.data;
        }
    }
}

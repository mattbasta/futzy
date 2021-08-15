declare module "trie-search" {
  export default class TrieSearch<Value> {
    constructor(
      keyFields?: Array<string>,
      options?: Partial<{
        min: number;
        ignoreCase: boolean;
        indexField: string | undefined;
        idFieldOrFunction: string | undefined;
        splitOnRegEx: RegExp | false;
        expandRegexes: Array<string>;
      }>
    );
    map(key: string, value: Value): void;
    search(prefix: string): Array<Value>;
  }
}

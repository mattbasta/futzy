const { Index } = require("./index");

const testCorpus = [
  "abc.def",
  "xxxx.yyyy",
  "xxx.abc.yyy.zzz.def",
  "xxx.abc.yyy.zzz",
  "xxx.abc.yyy",
  "xxx.abc.defg",
];

describe("Index", () => {
  describe("indexing", () => {
    it("should produce an appropriate token trie", () => {
      const {
        index: { tokenTrie },
      } = new Index(testCorpus);
      expect(tokenTrie.search("d").sort()).toEqual(["def", "defg"]);
      expect(tokenTrie.search("x").sort()).toEqual(["xxx", "xxxx"]);
      expect(tokenTrie.search("a").sort()).toEqual(["abc"]);
    });
    it("should produce an appropriate record trie", () => {
      const {
        index: { recordTrie },
      } = new Index(testCorpus);
      expect(
        recordTrie
          .search("d")
          .map((x) => x.normalized)
          .sort()
      ).toEqual(["abc.def", "xxx.abc.defg", "xxx.abc.yyy.zzz.def"]);
    });
  });
});

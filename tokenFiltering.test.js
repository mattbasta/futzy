const tokenFiltering = require("./tokenFiltering");
const tokenizer = require("./tokenizer");

function matchingTokens(query) {
  return tokenizer.tokenizeString(query).map((x) => new Set([x]));
}

describe("recordMatchesWithScore", () => {
  it("should have a score of zero for in-order tokens", () => {
    const record = tokenizer.tokenizeRecord("abc.def");
    expect(record.tokens).toEqual(["abc", "def"]);
    expect(
      tokenFiltering.getBaseScore(record, 2)
    ).toBe(1 - 1 / record.original.length);
  });

  it("should have a score with multiples of 0.5 for in-order token matches with no misses", () => {
    const queryTokens = matchingTokens("abc.def");

    expect(
      tokenFiltering.recordMatchesWithScore(
        tokenizer.tokenizeRecord("abc.def"),
        queryTokens
      )
    ).toBe(0);

    expect(
      tokenFiltering.recordMatchesWithScore(
        tokenizer.tokenizeRecord("zzz.abc.def"),
        queryTokens
      )
    ).toBe(0.5);

    expect(
      tokenFiltering.recordMatchesWithScore(
        tokenizer.tokenizeRecord("zzz.xxx.abc.def"),
        queryTokens
      )
    ).toBe(1);
  });

  it("should have a score with multiples of 1 for in-order token matches with misses", () => {
    const queryTokens = matchingTokens("abc.def");

    expect(
      tokenFiltering.recordMatchesWithScore(
        tokenizer.tokenizeRecord("abc.def"),
        queryTokens
      )
    ).toBe(0);

    expect(
      tokenFiltering.recordMatchesWithScore(
        tokenizer.tokenizeRecord("abc.zzz.def"),
        queryTokens
      )
    ).toBe(1);

    expect(
      tokenFiltering.recordMatchesWithScore(
        tokenizer.tokenizeRecord("abc.zzz.xxx.def"),
        queryTokens
      )
    ).toBe(2);
  });

  it("should have a score with multiples of 1 and 0.5 for in-order token matches with misses and an initial offset", () => {
    const queryTokens = matchingTokens("abc.def");

    expect(
      tokenFiltering.recordMatchesWithScore(
        tokenizer.tokenizeRecord("zzz.abc.xxx.def"),
        queryTokens
      )
    ).toBe(1 + 0.5);

    expect(
      tokenFiltering.recordMatchesWithScore(
        tokenizer.tokenizeRecord("zzz.yyy.abc.xxx.def"),
        queryTokens
      )
    ).toBe(1 + 1);
  });

  it("should not score items which have out-of-order tokens", () => {
    const record = tokenizer.tokenizeRecord("abc.def_ghi");
    expect(
      tokenFiltering.recordMatchesWithScore(record, matchingTokens("def.abc"))
    ).toBe(null);
    expect(
      tokenFiltering.recordMatchesWithScore(record, matchingTokens("ghi.abc"))
    ).toBe(null);
  });
});

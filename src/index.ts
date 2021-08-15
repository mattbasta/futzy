import TrieSearch from "trie-search";

import * as tokenizer from "./tokenizer";
import { filterRecordsOnTokens } from "./tokenFiltering";
// import matchRecordsToTokens from "./matchRecordsToTokens";

const DEFAULT_OPTIONS = {
  performRawSearch: false,
  performRawSearchWhenNoResults: true,
  resultLimit: 20,
};
type Options = typeof DEFAULT_OPTIONS;

type InnerIndex = {
  tokenTrie: TrieSearch<string>;
  recordTrie: TrieSearch<tokenizer.Record>;
  tokenMapping: Record<string, Array<tokenizer.Record>>;
};

export class Index {
  options: Options;
  lastPerformanceCheckpointData: Record<string, number> | null = null;

  rawData: Array<string>;
  tokenizedData: Array<tokenizer.Record> | null = null;
  index: InnerIndex | null = null;

  constructor(
    values: Array<string>,
    options: Partial<Options> = DEFAULT_OPTIONS
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.rawData = values;

    this.reindex();
  }

  reindex() {
    this.tokenizedData = this.rawData.map(tokenizer.tokenizeRecord);

    const tokenTrie = new TrieSearch<string>([], { splitOnRegEx: false });
    const recordTrie = new TrieSearch<tokenizer.Record>([], { splitOnRegEx: false });
    const tokenMapping: Record<string, Array<tokenizer.Record>> = {};
    for (const record of this.tokenizedData) {
      for (const token of record.tokens) {
        recordTrie.map(token, record);
        if (!tokenMapping.hasOwnProperty(token)) {
          tokenTrie.map(token, token);
          tokenMapping[token] = [record];
        } else if (!tokenMapping[token].includes(record)) {
          tokenMapping[token].push(record);
        }
      }
    }

    for (const token of Object.keys(tokenMapping)) {
      tokenMapping[token].sort((a, b) => a.original.length - b.original.length);
    }

    this.index = { tokenTrie, tokenMapping, recordTrie };
  }

  search(query: string, optionsOverride?: Partial<Options>) {
    const { index, tokenizedData } = this;
    if (!index || !tokenizedData) {
      throw new Error("No valid index");
    }

    const queryLower = query.toLowerCase();
    const queryTokens = tokenizer.tokenizeString(queryLower);

    const options = { ...this.options, ...optionsOverride };

    let results = [];

    const checkpoints: Record<string, number> = {
      start: Date.now(),
    };

    // An array of sets. One set per token in the query, with each set containing
    // all indexed tokens that match that token.
    const matchingTokensAsArrays: Array<Array<string>> = queryTokens.map((qt) =>
      index.tokenTrie.search(qt)
    );
    checkpoints.matchingTokensFromTrie = Date.now();
    const matchingTokensOrdered = matchingTokensAsArrays.map((x) => new Set(x));
    checkpoints.matchingTokensFromTrieDeduped = Date.now();

    // An array of sets. One set per token in the query, with each set containing
    // all records that match that token.
    const matchingRecordsPerToken = queryTokens.map((qt) =>
      // new Set(index.recordTrie.search(qt))
      index.recordTrie.search(qt)
    );
    checkpoints.matchRecordsToTokens = Date.now();

    if (matchingRecordsPerToken.length) {
      // Find plausible resulst by filtering down to documents which only exist as
      // matches for each token
      let plausibleTokenResults;
      if (matchingRecordsPerToken.length === 1) {
        // In the case where there's only one token in the query, just go with that
        plausibleTokenResults = matchingRecordsPerToken[0];
      } else {
        const initialMatchingRecordsPerToken = matchingRecordsPerToken[0];
        const subsequentTokenResults = matchingRecordsPerToken
          .slice(1)
          .map((x) => new Set(x));
        plausibleTokenResults = [...initialMatchingRecordsPerToken].filter(
          (result) =>
            subsequentTokenResults.every((results) => results.has(result))
        );
      }
      checkpoints.plausibleResultFiltering = Date.now();

      const filteredRecords = filterRecordsOnTokens(
        plausibleTokenResults,
        matchingTokensOrdered,
        options.resultLimit
      );
      checkpoints.tokenResultFiltering = Date.now();
      const bestFilteredResults = filteredRecords.range(0, options.resultLimit);
      results.push(...bestFilteredResults);
      checkpoints.cullingFilteredResults = Date.now();
    }

    if (
      options.performRawSearch ||
      (!results.length &&
        options.performRawSearchWhenNoResults &&
        results.length < options.resultLimit)
    ) {
      for (const datum of tokenizedData) {
        if (datum.normalized.includes(queryLower) && !results.includes(datum)) {
          results.push(datum);
          if (results.length >= options.resultLimit) {
            break;
          }
        }
      }
    }

    if (results.length > options.resultLimit) {
      results = results.slice(0, options.resultLimit);
    }

    checkpoints.rawSearch = Date.now();

    this.lastPerformanceCheckpointData = checkpoints;

    return results;
  }
}

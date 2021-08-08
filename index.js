const TrieSearch = require("trie-search");

const tokenizer = require("./tokenizer");
const { filterRecordsOnTokens } = require("./tokenFiltering");
const matchRecordsToTokens = require("./matchRecordsToTokens");

const DEFAULT_OPTIONS = {
  // indexChunkyStrings: true,
  // indexTinyStrings: true,
  performRawSearch: false,
  performRawSearchWhenNoResults: true,
  preindexOneCharacterResults: false,
  resultLimit: 20,
};

exports.Index = class Index {
  constructor(values, options = DEFAULT_OPTIONS) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.rawData = values;

    this.tokenizedData = null;
    this.index = null;
    this.reindex();

    this.lastPerformanceCheckpointData = null;
  }

  reindex() {
    this.tokenizedData = this.rawData.map(tokenizer.tokenizeRecord);

    const tokenTrie = new TrieSearch([], { splitOnRegEx: false });
    const recordTrie = new TrieSearch([], { splitOnRegEx: false });
    const tokenMapping = {};
    for (const record of this.tokenizedData) {
      // if (this.options.indexChunkyStrings) {
      //   if (!(record.normalized in tokenMapping)) {
      //     tokenTrie.map(record.normalized, record.normalized);
      //     tokenMapping[record.normalized] = new Set();
      //   }
      //   tokenMapping[record.normalized].add(record);
      // }
      // if (this.options.indexTinyStrings) {
      for (const token of record.tokens) {
        recordTrie.map(token, record);
        if (!tokenMapping.hasOwnProperty(token)) {
          tokenTrie.map(token, token);
          tokenMapping[token] = [record];
        } else if (!tokenMapping[token].includes(record)) {
          tokenMapping[token].push(record);
        }
      }
      // }
    }

    for (const token of Object.keys(tokenMapping)) {
      tokenMapping[token].sort((a, b) => a.original.length - b.original.length);
    }

    this.index = { tokenTrie, tokenMapping, recordTrie };
  }

  search(query, optionsOverride) {
    const queryLower = query.toLowerCase();
    const queryTokens = tokenizer.tokenizeString(queryLower);

    const options = { ...this.options, ...optionsOverride };

    let results = [];

    const checkpoints = {
      start: Date.now(),
    };

    // An array of sets. One set per token in the query, with each set containing
    // all indexed tokens that match that token.
    const matchingTokensAsArrays = queryTokens.map((qt) =>
      this.index.tokenTrie.search(qt)
    );
    checkpoints.matchingTokensFromTrie = Date.now();
    const matchingTokensOrdered = matchingTokensAsArrays.map((x) => new Set(x));
    checkpoints.matchingTokensFromTrieDeduped = Date.now();

    // An array of sets. One set per token in the query, with each set containing
    // all records that match that token.
    // const matchingRecordsPerToken = matchRecordsToTokens(
    //   matchingTokensOrdered,
    //   this.index,
    //   queryTokens
    // );
    const matchingRecordsPerToken = queryTokens.map((qt) =>
      // new Set(this.index.recordTrie.search(qt))
      this.index.recordTrie.search(qt)
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
        const subsequentTokenResults = matchingRecordsPerToken.slice(1).map(x => new Set(x));
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
      for (const datum of this.tokenizedData) {
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
};

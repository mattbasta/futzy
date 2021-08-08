module.exports = function matchRecordsToTokens(
  matchingTokensOrdered,
  index,
  queryTokens
) {
  const positionSetCache = {};
  // const tokenRecordCache = {};

  const queryTokenCount = queryTokens.length;
  return matchingTokensOrdered.map((matchingTokens, i) => {
    const queryToken = queryTokens[i];
    if (positionSetCache.hasOwnProperty(queryToken)) {
      return positionSetCache[queryToken];
    }

    let rawPositionResults = [];
    for (const token of matchingTokens) {
      // For each token in the corpus that matches a token in the query,
      // populate a set with all of the matching records
      // if (tokenRecordCache.hasOwnProperty(token)) {
      //   rawPositionResults = rawPositionResults.concat(tokenRecordCache[token]);
      //   continue;
      // }
      const filteredTokenRecords = index.tokenMapping[token].filter(
        (record) =>
          record.tokens.length >= queryTokenCount &&
          (i || record.tokens[0] === token)
      );
      // tokenRecordCache[token] = filteredTokenRecords;
      rawPositionResults = rawPositionResults.concat(filteredTokenRecords);
    }

    const positionSet = new Set(rawPositionResults);
    positionSetCache[queryToken] = positionSet;
    return positionSet;
  });
};

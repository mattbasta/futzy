import SortedSet from "redis-sorted-set";

import type { Record } from "./tokenizer";

export function getBaseScore(record: Record, queryTokenCount: number) {
  const recordTokenCount = record.tokens.length;
  return (
    // Unused tokens get a higher score by default
    Math.abs(recordTokenCount - queryTokenCount) +
    // Add an amount to bias equally-weighted scores towards shorter results
    (1 - 1 / record.original.length)
  );
}

export function filterRecordsOnTokens(
  records: Array<Record>,
  matchingTokensFromQuery: Array<Set<string>>,
  limit: number
) {
  const results = new SortedSet();
  let maxScore = 0;
  let recordCount = 0;
  let limitReached = false;
  for (const record of records) {
    const baseScore = getBaseScore(record, matchingTokensFromQuery.length);
    if (limitReached && baseScore >= maxScore) {
      continue;
    }
    const addedScore = recordMatchesWithScore(record, matchingTokensFromQuery);
    if (addedScore == null) {
      continue;
    }
    const score = addedScore + baseScore;
    // Don't sort/store records that wouldn't appear in the top N
    if (score > maxScore && limitReached) {
      continue;
    }
    results.add(record, score);
    recordCount += 1;
    limitReached = recordCount > limit;
    maxScore = Math.max(maxScore, score);
  }
  return results;
}

// Cost to score for each index of the initial offset
const INITIAL_OFFSET_SCORE = 0.5;
// Cost to the score for subsequent misses
const SUBSEQUENT_OFFSET_SCORE = 1;

export function recordMatchesWithScore(
  record: Record,
  matchingTokensFromQuery: Array<Set<string>>
) {
  const queryTokenCount = matchingTokensFromQuery.length;
  const recordTokenCount = record.tokens.length;

  for (let i = 0; i <= recordTokenCount - queryTokenCount; i++) {
    const matches = matchingTokensFromQuery[0].has(record.tokens[i]);
    if (!matches) {
      continue;
    }
    if (queryTokenCount === 1) {
      return i * INITIAL_OFFSET_SCORE;
    }
    let queryPos = 1;
    let misses = 0;
    // TODO: I think this can be optimized further?
    for (let j = i + 1; j < recordTokenCount; j++) {
      const matches = matchingTokensFromQuery[queryPos].has(record.tokens[j]);
      if (matches) {
        queryPos += 1;
        if (queryPos === queryTokenCount) {
          return i * INITIAL_OFFSET_SCORE + misses * SUBSEQUENT_OFFSET_SCORE;
        }
      } else {
        misses += 1;
      }
    }
  }

  return null;
}

export type Record = { original: string; normalized: string; tokens: Array<string> };

export const tokenizeRecord = (value: string): Record => {
  const normalized = value.toLowerCase();
  return {
    original: value,
    normalized,
    tokens: exports.tokenizeString(normalized),
  };
};

export const tokenizeString = (value: string): Array<string> =>
  value.split(/[^0-9a-z]/gi).filter((x) => x && !/^[0-9]+$/.exec(x));

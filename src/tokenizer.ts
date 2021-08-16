export type Record = {
  original: string;
  normalized: string;
  tokens: ReadonlyArray<string>;
};

export const tokenizeRecord = (value: string): Record => {
  const normalized = value.toLowerCase();
  return Object.freeze({
    original: value,
    normalized,
    tokens: tokenizeString(normalized),
  });
};

export const tokenizeString = (value: string): ReadonlyArray<string> =>
  Object.freeze(
    value.split(/[^0-9a-z]/gi).filter((x) => x && !/^[0-9]+$/.exec(x))
  );

exports.tokenizeRecord = (value) => {
  const normalized = value.toLowerCase();
  return {
    original: value,
    normalized,
    tokens: exports.tokenizeString(normalized),
  };
};

exports.tokenizeString = (value) =>
  value.split(/[^0-9a-z]/gi).filter((x) => x && !/^[0-9]+$/.exec(x));

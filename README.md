# futzy

Futzy is a configurable fuzzy matching library for tools which search over structured input. Unlike many other fuzzy matching libraries which match arbitrary characters, Futzy matches based on tokens. Tokenization unlocks meaningful performance improvements (especially for very large datasets), and provides more accurate search results (at the cost of a small number of keypresses).

Futzy breaks strings in the provided dataset into tokens. Tokens are case-insensitive and must be alphanumeric. Non-alphanumeric characters are not indexed. Results are sorted based on relevance, where "relevance" prioritizes strings which have matching tokens earlier in the string, and strings where matching tokens have the fewest possible tokens between them.

Performance is achieved in a few ways:
- Minimizing allocations (search operations avoid allocating new objects or arrays), which avoids garbage collection
- Using efficient data structures to reduce time complexity of insertions and lookups
- Trading memory use for performance: Futzy uses extra memory in its index to reduce the time complexity of searches
- Short-circuiting aggressively
- Avoiding full scans of the provided dataset

## Usage

```js
const {Index} = require('futzy');

const testCorpus = [
  "abc.def",
  "xxxx.yyyy",
  "xxx.abc.yyy.zzz.def",
  "xxx.abc.yyy.zzz",
  "xxx.abc.yyy",
  "xxx.abc.defg",
];
const index = new Index(testCorpus, {});
const results = index.search('a d');
/*
results ==
[
  "abc.def",
  "xxx.abc.defg",
  "xxx.abc.yyy.zzz.def",
]
*/
```

The `Index` class takes two parameters:
- An `Array<string>`, which is the dataset
- Optionally, an object with options.

The options object may have these members:

- `performRawSearch` (Default `false`): If there are fewer results than `resultLimit`, strings in the dataset that contain the search query as a substring are appended to the results, up to `resultLimit`.
- `performRawSearchWhenNoResults` (Default `true`): Only performs the `performRawSearch` behavior if there would otherwise be no results. This is useful as a backup to support weird queries.
- `resultLimit` (Default `20`): The maximum number of strings to return in the results. Keeping this value small improves performance for large datasets.

## Matching

Input is first tokenized. E.g., `fo ba za` becomes `['fo', 'ba', 'za']`. Each string is tested. To be a plausible result, the string must contain each of the provided tokens, in order. For example, the following input strings would match:

- `foo.bar.zap`
- `fomo is bad but zalgo does not care`
- `FOO BAR ZAP`
- `fo ba za`

The following input strings would not match:

- `football zap`
- `foo zap bar`
- `f oo bar zap`
- `foobarzap`

## Usefulness

This algorithm is useful for the following types of UIs:

1. Database table search
1. Metric name search
1. Long lists of URLs
1. File lookup (e.g., the output of `git ls-files`)
1. Software namespaces or software package names

Any dataset which has a reasonable cardinality of tokens (relative to the number of strings), where each string is cleanly divided into tokens, is likely a good fit for Futzy.

## Known limitations

- Tokens cannot contain non-alphanumeric characters (e.g., accented characters). This is likely a straightforward fix in `tokenizer.js`, and contributions are welcome.
- Constants used for scoring relevance are non-configurable.
- Indexes cannot be updated

Additionally, the following performance issues are known, though they are generally only problematic with large datasets:

- Datasets with many strings that contain one-character or two-character tokens may exhibit poor search performance for short queries. You may wish to require a minimum length (e.g., 3-4 characters) when querying.
- Datasets with very large numbers of unique tokens (e.g., a set of many distinct UUIDs) may have very high memory use

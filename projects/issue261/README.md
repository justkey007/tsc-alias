# tsc-alias issue #261 — minimal reproduction

Reproduction for **[justkey007/tsc-alias#261](https://github.com/justkey007/tsc-alias/issues/261)**,
a regression introduced in **tsc-alias 1.9.0** (via [PR #259](https://github.com/justkey007/tsc-alias/pull/259)).

## The bug

When a source file has the **same base name as an npm package it imports**, tsc-alias
1.9.0 rewrites the bare module specifier into a relative path pointing at the file itself.

Given `src/redis.ts`:

```ts
import { createClient } from 'redis';
const client = createClient();
```

| tsc-alias | compiled `dist/redis.js` | result |
|-----------|--------------------------|--------|
| **1.8.17** | `const redis_1 = require("redis");` | ✅ works |
| **1.9.0**  | `const redis_1 = require("./redis");` | ❌ module requires itself |

On 1.9.0 the module ends up requiring itself, so the named export is `undefined`
at runtime:

```
TypeError: (0 , redis_1.createClient) is not a function
```

## Root cause

This `tsconfig.json` uses `compilerOptions.paths` **without** `baseUrl`. `baseUrl`
was deprecated in TypeScript 6.0, so we intentionally rely only on `paths` with
relative mappings.

PR #259 ("support ts 6 implicit baseURL") added logic in `src/helpers/config.ts`:
when `paths` is set but `baseUrl` is not, it assigns `config.baseUrl = rootDir`.
With a `baseUrl` now in effect, tsc-alias treats a **bare** specifier like `redis`
as resolvable against the source dir, and because `src/redis.ts` exists it rewrites
`require("redis")` → `require("./redis")`.

Bare module specifiers (npm packages) should never be rewritten to relative paths —
only aliases configured in `compilerOptions.paths` (here, `@app/*`) should be transformed.

## How to reproduce

```bash
npm install
npm run build          # tsc --noCheck && tsc-alias  (uses tsc-alias 1.9.0)
grep require dist/redis.js
#   => const redis_1 = require("./redis");   ❌

node ./dist/redis.js
#   => TypeError: (0 , redis_1.createClient) is not a function
```

### Side-by-side comparison (1.8.17 vs 1.9.0)

```bash
./repro.sh
```

This installs each version in turn, rebuilds, and prints the `require()` line plus
the runtime result for both.

## Environment

- tsc-alias **1.9.0** (regressed) — **1.8.17** works
- TypeScript **6.0.3**
- CommonJS output
- `tsconfig.json` intentionally has **no `baseUrl`**

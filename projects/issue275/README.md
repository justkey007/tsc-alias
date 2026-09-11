# tsc-alias `../` alias + separate outDir repro

Minimal repro for https://github.com/justkey007/tsc-alias/issues/275, requested by
@justkey007: "a repo to reproduce the bug would be helpful".

## Shape

A two-package layout (`shared` + `server`), the common monorepo shape:

- `shared/` — a package built by `tsc` on its own, `rootDir: "."`, `outDir: "dist"`.
  Its compiled output lives at `shared/dist/permissions.js`, not `shared/permissions.js`.
- `server/` — imports `shared`'s source via a TS path alias, no `baseUrl` set:
  ```json
  "paths": { "@shared/*": ["../shared/*"] }
  ```
  `server/tsconfig.json` also has `rootDir: "src"` / `outDir: "dist"`, and a
  project reference to `../shared` (so `tsc` can typecheck across the
  boundary without pulling `shared`'s `.ts` into `server`'s own `rootDir`).

This is exactly the shape you get any time an aliased package is *itself* a
built TS project with a different `rootDir`/`outDir`, rather than a plain
`.ts`-only workspace — e.g. `@shared/*` resolves for **type-checking**
against `shared`'s source, but the corresponding **build artifact**
(`shared/dist/permissions.js`) lives one directory level deeper.

## Repro steps

```sh
npm install --prefix server   # installs typescript + tsc-alias (pinned 1.9.4)

# 1. Build shared for real
npx --prefix server tsc -p shared/tsconfig.json

# 2. Build server for real
npx --prefix server tsc -p server/tsconfig.json
cat server/dist/auth/with-permissions.js
# -> const permissions_1 = require("@shared/permissions");   (unrewritten, expected pre-tsc-alias)

# 3. Run tsc-alias to rewrite the alias into a working relative require
npx --prefix server tsc-alias -p server/tsconfig.json --debug
cat server/dist/auth/with-permissions.js
# -> STILL const permissions_1 = require("@shared/permissions");   (BUG: left unrewritten)
```

## What the `--debug` output shows

```
tsc-alias debug: default replacer - requiredModule:  '@shared/permissions'
tsc-alias debug: default replacer - alias:  {
  prefix: '@shared/',
  ...
  paths: [ { path: '../../shared/', isExtra: false, basePath: '.../server/dist' } ]
}
tsc-alias debug: default replacer - absoluteAliasPath:  '.../shared/permissions'
tsc-alias debug: default replacer - Invalid path
tsc-alias debug: replaced file without changes: '.../server/dist/auth/with-permissions.js'
```

`absoluteAliasPath` is computed correctly — it points at the real
`shared/permissions` — but that's `shared`'s TS **source** location, not
where its compiled output actually is (`shared/dist/permissions.js`).
`tsc-alias` only checks for `permissions.{js,json,jsx,cjs,mjs,d.ts,d.tsx,d.cts,d.mts}`
directly at `absoluteAliasPath`; since none of those exist at `shared/permissions.*`
(only `shared/permissions.ts` and `shared/dist/permissions.js` do), the
existence check in `checkSingleAliasPath` (`default.replacer.path.js`) fails,
logs `Invalid path`, and the import is left untouched — which then throws
`Cannot find module '@shared/permissions'` at runtime, since nothing in
`node_modules` provides that specifier either.

## Environment

- tsc-alias: 1.9.4 (also reproduces on 1.9.0 — see the linked issue's
  comment thread; this is a distinct bug from the `baseUrl`-regression one
  `gilgardosh` found on the same issue)
- typescript: 5.2.2 (also reproduces on the `typescript@~6.0` line used
  elsewhere in that thread)
- Node: v22.12.0

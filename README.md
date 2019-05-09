# tsc-alias

Replace absolute paths to relative paths after typescript compilation (tsc) during compile-time. You can add aliases that reference other projects outside your tsconfig.json project by providing a relative path to the baseUrl.

## Comparison to [tsconfig-paths](https://github.com/dividab/tsconfig-paths)

\+ Compile time (no runtime dependencies)

## Getting Started

First, install tsc-alias as devDependency using npm or yarn.

```sh
npm install --save-dev tsc-alias
# or
yarn add -D tsc-alias
```

## Add it to your build scripts in package.json

```json
"scripts": {
  "build": "tsc --project tsconfig.json && tsc-alias -p tsconfig.json",
}
```

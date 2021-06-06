# tsc-alias

Replace alias paths with relative paths after typescript compilation. You can add aliases that reference other projects outside your tsconfig.json project by providing a relative path to the baseUrl.

[![npm version](https://badge.fury.io/js/tsc-alias.svg)](https://badge.fury.io/js/tsc-alias)
[![License](https://img.shields.io/:license-mit-blue.svg)](http://doge.mit-license.org)

## Comparison to [tsconfig-paths](https://github.com/dividab/tsconfig-paths)

\+ Compile time (no runtime dependencies)

## Getting Started

First, install tsc-alias as devDependency using npm.

```sh
npm install -g tsc-alias
```

```
npm install --save-dev tsc-alias
```

## Add it to your build scripts in package.json

```json
"scripts": {
  "build": "tsc --project tsconfig.json && tsc-alias -p tsconfig.json",
}

================ OR ===================

"scripts": {
  "build": "tsc && tsc-alias",
  "build:watch": "tsc -w & tsc-alias -w"
}
```

## API

### Installation

```sh
npm install tsc-alias
```

### Usage

```typescript
import { replaceTscAliasPaths } from 'tsc-alias';

replaceTscAliasPaths(options?);
```

Here are all the available options:

<table>
  <thead>
  <tr>
    <th>Option</th>
    <th>Description</th>
    <th>Default Value</th>
  </tr>
  </thead>
  <tbody>
    <tr>
      <td>configFile</td>
      <td>path to tsconfig.json</td>
      <td><code>'tsconfig.json'</code></td>
    </tr>
    <tr>
      <td>watch</td>
      <td>Observe file changes</td>
      <td><code>false</code></td>
    </tr>
    <tr>
      <td>outDir</td>
      <td>Run in a folder leaving the "outDir" of the tsconfig.json (relative path to tsconfig)</td>
      <td><code>tsconfig.compilerOptions.outDir</code></td>
    </tr>
    <tr>
      <td>resolveFullPaths</td>
      <td>Attempt to replace incomplete import paths (those not ending in <code>.js</code>) with fully resolved paths (for ECMAScript Modules compatibility)</td>
      <td><code>false</code></td>
    </tr>
    <tr>
      <td>silent</td>
      <td>Reduced terminal output</td>
      <td><code>false</code></td>
    </tr>
  </tbody>
</table>

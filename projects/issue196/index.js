const { readFileSync } = require('node:fs');

const fileContent = readFileSync('./dist/index.d.ts');
if (!["from './types.js'", "from './display/svg.js'"].every((str) => fileContent.includes(str))) {
  throw new Error('Wrong path resolution using tsc-alias');
}

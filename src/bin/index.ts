#! /usr/bin/env node
import * as program from 'commander';
import { replaceTscAliasPaths } from '..';

const { version } = require('../../package.json');

program
  .name('tsc-alias')
  .version(version)
  .option('-p, --project <file>', 'path to tsconfig.json')
  .option('-w, --watch', 'Observe file changes')
  .option(
    '--dir, --directory <dir>',
    'Run in a folder leaving the "outDir" of the tsconfig.json (relative path to tsconfig)'
  )
  .option('-s, --silent', 'reduced terminal output')
  .parse(process.argv);

replaceTscAliasPaths({
  configFile: program.project,
  watch: !!program.watch,
  outDir: program.directory,
  silent: program.silent
});

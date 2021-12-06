#! /usr/bin/env node
import { program } from 'commander';
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
  .option(
    '-f, --resolve-full-paths',
    'Attempt to fully resolve import paths if the corresponding .js file can be found'
  )
  .option('-s, --silent', 'reduced terminal output')
  .option('-r, --replacer <replacers...>', 'path to optional extra replacer')
  .parseAsync(process.argv);

const options = program.opts();

replaceTscAliasPaths({
  configFile: options.project,
  watch: !!options.watch,
  outDir: options.directory,
  silent: !!options.silent,
  resolveFullPaths: !!options.resolveFullPaths,
  replacers: options.replacer
});

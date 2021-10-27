#! /usr/bin/env node
import { Command, program } from 'commander';
import { replaceTscAliasPaths } from '..';

const { version } = require('../../package.json');

interface ITSCAlias extends Command {
  project: string,
  watch: boolean,
  directory: string,
  resolveFullPaths: boolean,
  silent: boolean,
}

const TSCAlias = program as ITSCAlias;

TSCAlias
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
  .parseAsync(process.argv);

replaceTscAliasPaths({
  configFile: TSCAlias.project,
  watch: !!TSCAlias.watch,
  outDir: TSCAlias.directory,
  silent: !!TSCAlias.silent,
  resolveFullPaths: !!TSCAlias.resolveFullPaths
});

#! /usr/bin/env node
import * as program from 'commander';
import { replaceTscAliasPaths } from '..';
program
  .name('tsc-alias')
  .version('1.1.0')
  .option('-p, --project <file>', 'path to tsconfig.json')
  .option('-w, --watch', 'Observe file changes')
  .option(
    '--dir, --directory <dir>',
    'Run in a folder leaving the "outDir" of the tsconfig.json (relative path to tsconfig)'
  )
  .parse(process.argv);

replaceTscAliasPaths({
  configFile: program.project,
  watch: !!program.watch,
  outDir: program.directory,
});

import * as normalizePath from 'normalize-path';
import {
  IConfig,
  IProjectConfig,
  ReplaceTscAliasPathsOptions
} from '../interfaces';
import { Output, PathCache, TrieNode } from '../utils';
import { basename, dirname, isAbsolute, normalize, resolve } from 'path';
import { existsSync } from 'fs';
import { loadConfig } from './config';
import { importReplacers } from './replacers';

export async function prepareConfig(
  options: ReplaceTscAliasPathsOptions = {
    watch: false,
    verbose: false,
    declarationDir: undefined,
    output: undefined,
    aliasTrie: undefined
  }
) {
  const output = options.output ?? new Output(options.verbose);

  const configFile = !options.configFile
    ? resolve(process.cwd(), 'tsconfig.json')
    : !isAbsolute(options.configFile)
    ? resolve(process.cwd(), options.configFile)
    : options.configFile;

  output.assert(existsSync(configFile), `Invalid file path => ${configFile}`);

  const {
    baseUrl = './',
    outDir,
    declarationDir,
    paths,
    replacers,
    resolveFullPaths,
    verbose
  } = loadConfig(configFile);

  output.setVerbose(verbose);

  if (options.resolveFullPaths || resolveFullPaths) {
    options.resolveFullPaths = true;
  }

  const _outDir = options.outDir ?? outDir;
  if (declarationDir && _outDir !== declarationDir) {
    options.declarationDir ??= declarationDir;
  }

  output.assert(_outDir, 'compilerOptions.outDir is not set');

  const configDir: string = normalizePath(dirname(configFile));

  // config with project details and paths
  const projectConfig: IProjectConfig = {
    configFile: configFile,
    baseUrl: baseUrl,
    outDir: _outDir,
    configDir: configDir,
    outPath: normalizePath(normalize(configDir + '/' + _outDir)),
    confDirParentFolderName: basename(configDir),
    hasExtraModule: false,
    configDirInOutPath: null,
    relConfDirPathInOutPath: null,
    pathCache: new PathCache(!options.watch)
  };

  const config: IConfig = {
    ...projectConfig,
    output: output,
    aliasTrie:
      options.aliasTrie ?? TrieNode.buildAliasTrie(projectConfig, paths),
    replacers: []
  };

  // Import replacers.
  await importReplacers(config, replacers, options.replacers);
  return config;
}

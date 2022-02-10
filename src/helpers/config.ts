import { Json } from 'mylas';
import * as findNodeModulesPath from 'find-node-modules';
import * as normalizePath from 'normalize-path';
import * as fs from 'fs';
import { basename, dirname, isAbsolute, join, normalize, resolve } from 'path';
import {
  IConfig,
  IProjectConfig,
  IRawTSConfig,
  ITSConfig,
  ReplaceTscAliasPathsOptions
} from '../interfaces';
import { Output, PathCache, TrieNode } from '../utils';
import { importReplacers } from '.';

const loadConfig = (file: string, output: Output): ITSConfig => {
  if (!fs.existsSync(file)) {
    output.error(`File ${file} not found`);
    process.exit();
  }
  const {
    extends: ext,
    compilerOptions: { baseUrl, outDir, declarationDir, paths } = {
      baseUrl: undefined,
      outDir: undefined,
      declarationDir: undefined,
      paths: undefined
    },
    'tsc-alias': TSCAliasConfig
  } = Json.loadS<IRawTSConfig>(file, true);

  const config: ITSConfig = {};
  if (baseUrl) config.baseUrl = baseUrl;
  if (outDir) config.outDir = outDir;
  if (paths) config.paths = paths;
  if (declarationDir) config.declarationDir = declarationDir;
  if (TSCAliasConfig?.replacers) config.replacers = TSCAliasConfig.replacers;
  if (TSCAliasConfig?.resolveFullPaths)
    config.resolveFullPaths = TSCAliasConfig.resolveFullPaths;
  if (TSCAliasConfig?.verbose) config.verbose = TSCAliasConfig.verbose;

  if (ext) {
    return {
      ...(ext.startsWith('.')
        ? loadConfig(
            join(dirname(file), ext.endsWith('.json') ? ext : `${ext}.json`),
            output
          )
        : loadConfig(resolveTsConfigExtendsPath(ext, file), output)),
      ...config
    };
  }

  return config;
};

export function resolveTsConfigExtendsPath(ext: string, file: string): string {
  const tsConfigDir = dirname(file);
  const node_modules: string[] = findNodeModulesPath({ cwd: tsConfigDir }); // Getting all node_modules directories.
  const targetPaths = node_modules.map((v) => join(tsConfigDir, v, ext)); // Mapping node_modules to target paths.

  // Recursively checking ancestor directories for tsconfig.
  for (const targetPath of targetPaths) {
    if (ext.endsWith('.json')) {
      // Check if the file exists.
      if (fs.existsSync(targetPath)) {
        return targetPath;
      } else {
        continue; // Continue checking when ext is a file but not yet found.
      }
    }
    let isDirectory = false;
    try {
      isDirectory = fs.lstatSync(targetPath).isDirectory();
    } catch (err) {}
    if (isDirectory) {
      return join(targetPath, 'tsconfig.json');
    } else {
      // When target is not a file nor directory check with '.json' extension.
      if (fs.existsSync(`${targetPath}.json`)) {
        return `${targetPath}.json`;
      }
    }
  }
}

export async function initConfig(options: ReplaceTscAliasPathsOptions) {
  const output = options.output ?? new Output(options.verbose);

  const configFile = !options.configFile
    ? resolve(process.cwd(), 'tsconfig.json')
    : !isAbsolute(options.configFile)
    ? resolve(process.cwd(), options.configFile)
    : options.configFile;

  output.assert(
    fs.existsSync(configFile),
    `Invalid file path => ${configFile}`
  );

  const {
    baseUrl = './',
    outDir,
    declarationDir,
    paths,
    replacers,
    resolveFullPaths,
    verbose
  } = loadConfig(configFile, output);

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
    pathCache: new PathCache(!options.watch),
    output: output
  };

  const config: IConfig = {
    ...projectConfig,
    aliasTrie:
      options.aliasTrie ?? TrieNode.buildAliasTrie(projectConfig, paths),
    replacers: []
  };

  // Import replacers.
  await importReplacers(config, replacers, options.replacers);

  return config;
}

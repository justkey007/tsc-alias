import { watch } from 'chokidar';
import { existsSync } from 'fs';
import { sync } from 'globby';
import * as normalizePath from 'normalize-path';
import { basename, dirname, isAbsolute, normalize, resolve } from 'path';
import { importReplacers, loadConfig, replaceAlias } from './helpers';
import {
  ReplaceTscAliasPathsOptions,
  IConfig,
  AliasReplacer,
  IProjectConfig,
  AliasReplacerArguments
} from './interfaces';
import { Output, PathCache, TrieNode } from './utils';

// export interfaces for api use.
export {
  ReplaceTscAliasPathsOptions,
  AliasReplacer,
  AliasReplacerArguments,
  IConfig,
  IProjectConfig
};

export async function replaceTscAliasPaths(
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

  // Finding files and changing alias paths
  const globPattern = [
    `${config.outPath}/**/*.{mjs,cjs,js,jsx,d.{mts,cts,ts,tsx}}`,
    `!${config.outPath}/**/node_modules`
  ];
  const files = sync(globPattern, {
    dot: true,
    onlyFiles: true
  });

  // Make array with promises for file changes
  // Wait for all promises to resolve
  const replaceList = await Promise.all(
    files.map((file) => replaceAlias(config, file, options?.resolveFullPaths))
  );

  // Count all changed files
  const replaceCount = replaceList.filter(Boolean).length;

  output.info(`${replaceCount} files were affected!`);
  if (options.watch) {
    output.setVerbose(true);
    output.info('[Watching for file changes...]');
    const filesWatcher = watch(globPattern);
    const tsconfigWatcher = watch(config.configFile);
    const onFileChange = async (file: string) =>
      await replaceAlias(config, file, options?.resolveFullPaths);
    filesWatcher.on('add', onFileChange);
    filesWatcher.on('change', onFileChange);
    tsconfigWatcher.on('change', () => {
      output.clear();
      filesWatcher.close();
      tsconfigWatcher.close();
      replaceTscAliasPaths(options);
    });
  }
  if (options.declarationDir) {
    replaceTscAliasPaths({
      ...options,
      outDir: options.declarationDir,
      declarationDir: undefined,
      output: config.output,
      aliasTrie: config.aliasTrie
    });
  }
}

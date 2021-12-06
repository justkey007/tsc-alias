import { watch } from 'chokidar';
import { existsSync, promises as fsp } from 'fs';
import { sync } from 'globby';
import * as normalizePath from 'normalize-path';
import {
  basename,
  dirname,
  isAbsolute,
  normalize,
  relative,
  resolve
} from 'path';
import {
  findBasePathOfAlias,
  importReplacers,
  loadConfig,
  relativeOutPathToConfigDir
} from './helpers';
import {
  ReplaceTscAliasPathsOptions,
  Alias,
  IConfig,
  AliasReplacer
} from './interfaces';
import {
  Output,
  PathCache,
  replaceSourceImportPaths,
  resolveFullImportPaths,
  TrieNode
} from './utils';

// export interfaces for api use.
export { ReplaceTscAliasPathsOptions, AliasReplacer };

export async function replaceTscAliasPaths(
  options: ReplaceTscAliasPathsOptions = {
    watch: false,
    silent: false,
    declarationDir: undefined,
    output: undefined
  }
) {
  const output = options.output ?? new Output(options.silent);

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
    replacers
  } = loadConfig(configFile);
  const _outDir = options.outDir ?? outDir;
  if (declarationDir && _outDir !== declarationDir) {
    options.declarationDir ??= declarationDir;
  }

  output.assert(_outDir, 'compilerOptions.outDir is not set');

  const configDir: string = normalizePath(dirname(configFile));

  const config: IConfig = {
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
    output: output,
    aliasTrie: new TrieNode<Alias>(),
    replacers: []
  };

  // Import replacers.
  await importReplacers(config, replacers, options.replacers);

  if (paths) {
    Object.keys(paths)
      .map((alias) => {
        return {
          shouldPrefixMatchWildly: alias.endsWith('*'),
          prefix: alias.replace(/\*$/, ''),
          // Normalize paths.
          paths: paths[alias].map((path) => {
            path = path
              .replace(/\*$/, '')
              .replace(/\.([mc])?ts(x)?$/, '.$1js$2');
            if (isAbsolute(path)) {
              path = relative(config.configDir, path);
            }

            if (normalize(path).includes('..') && !config.configDirInOutPath) {
              relativeOutPathToConfigDir(config);
            }

            return path;
          })
        };
      })
      .forEach((alias) => {
        if (alias.prefix) {
          // Add all aliases to AliasTrie.
          config.aliasTrie.add(alias.prefix, {
            ...alias,
            // Find basepath of aliases.
            paths: alias.paths.map(findBasePathOfAlias(config))
          });
        }
      });
  }

  /**
   * replaceAlias replaces aliases in file.
   * @param file file to replace aliases in.
   * @param resolveFullPath if tsc-alias should resolve the full path
   * @returns if something has been replaced.
   */
  const replaceAlias = async (
    file: string,
    resolveFullPath?: boolean
  ): Promise<boolean> => {
    const code = await fsp.readFile(file, 'utf8');
    let tempCode = code;

    config.replacers.forEach((replacer) => {
      tempCode = replaceSourceImportPaths(tempCode, file, (orig) =>
        replacer({
          orig,
          file,
          config
        })
      );
    });

    // Fully resolve all import paths (not just aliased ones)
    // *after* the aliases are resolved
    if (resolveFullPath) {
      tempCode = resolveFullImportPaths(tempCode, file);
    }

    if (code !== tempCode) {
      await fsp.writeFile(file, tempCode, 'utf8');
      return true;
    }
    return false;
  };

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
    files.map((file) => replaceAlias(file, options?.resolveFullPaths))
  );

  // Count all changed files
  const replaceCount = replaceList.filter(Boolean).length;

  output.info(`${replaceCount} files were affected!`);
  if (options.watch) {
    output.info('[Watching for file changes...]');
    const filesWatcher = watch(globPattern);
    const tsconfigWatcher = watch(config.configFile);
    const onFileChange = async (file: string) =>
      await replaceAlias(file, options?.resolveFullPaths);
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
      output: config.output
    });
  }
}

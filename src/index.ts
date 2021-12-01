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
  loadConfig,
  relativeOutPathToConfigDir,
  replaceBaseUrlImport,
  replaceImportStatement
} from './helpers';
import { ReplaceTscAliasPathsOptions, Alias, IConfig } from './interfaces';
import {
  newStringRegex,
  Output,
  PathCache,
  replaceSourceImportPaths,
  resolveFullImportPaths,
  TrieNode
} from './utils';

// export interfaces for api use.
export { ReplaceTscAliasPathsOptions };

export async function replaceTscAliasPaths(
  options: ReplaceTscAliasPathsOptions = {
    watch: false,
    silent: false
  }
) {
  const output = new Output(options.silent);
  output.info('=== tsc-alias starting ===');

  const configFile = !options.configFile
    ? resolve(process.cwd(), 'tsconfig.json')
    : !isAbsolute(options.configFile)
    ? resolve(process.cwd(), options.configFile)
    : options.configFile;

  output.assert(existsSync(configFile), `Invalid file path => ${configFile}`);

  let { baseUrl = './', outDir, paths } = loadConfig(configFile);
  if (options.outDir) outDir = options.outDir;

  output.assert(outDir, 'compilerOptions.outDir is not set');

  const configDir: string = normalizePath(dirname(configFile));

  const config: IConfig = {
    configFile: configFile,
    baseUrl: baseUrl,
    outDir: outDir,
    configDir: configDir,
    outPath: normalizePath(normalize(configDir + '/' + outDir)),
    confDirParentFolderName: basename(configDir),
    hasExtraModule: false,
    configDirInOutPath: null,
    relConfDirPathInOutPath: null,
    pathCache: new PathCache(!options.watch),
    output: output
  };

  const AliasTrie = new TrieNode<Alias>();

  Object.keys(paths)
    .map((alias) => {
      return {
        shouldPrefixMatchWildly: alias.endsWith('*'),
        prefix: alias.replace(/\*$/, ''),
        // Normalize paths.
        paths: paths[alias].map((path) => {
          path = path.replace(/\*$/, '').replace(/\.([mc])?ts(x)?$/, '.$1js$2');
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
        AliasTrie.add(alias.prefix, {
          ...alias,
          // Find basepath of aliases.
          paths: alias.paths.map(findBasePathOfAlias(config))
        });
      }
    });

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

    tempCode = replaceSourceImportPaths(tempCode, file, (orig) => {
      // Lookup which alias should be used for this given requiredModule.
      const alias = AliasTrie.search(
        orig.match(newStringRegex())?.groups?.path
      );
      // If an alias is found replace it or return the original.
      return alias
        ? replaceImportStatement({
            orig,
            file,
            alias,
            config
          })
        : orig;
    });

    tempCode = replaceSourceImportPaths(tempCode, file, (orig) =>
      replaceBaseUrlImport({
        orig,
        file,
        config
      })
    );

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
    tsconfigWatcher.on('change', (_) => {
      output.clear();
      filesWatcher.close();
      tsconfigWatcher.close();
      replaceTscAliasPaths(options);
    });
  }
}

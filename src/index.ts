import { watch } from 'chokidar';
import { sync } from 'globby';
import { initConfig, replaceAlias, replaceFile } from './helpers';
import {
  ReplaceTscAliasPathsOptions,
  IConfig,
  AliasReplacer,
  IProjectConfig,
  AliasReplacerArguments
} from './interfaces';

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
  const config: IConfig = await initConfig(options);

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
    files.map((file) => replaceFile(config, file, options?.resolveFullPaths))
  );

  // Count all changed files
  const replaceCount = replaceList.filter(Boolean).length;

  config.output.info(`${replaceCount} files were affected!`);
  if (options.watch) {
    config.output.setVerbose(true);
    config.output.info('[Watching for file changes...]');
    const filesWatcher = watch(globPattern);
    const tsconfigWatcher = watch(config.configFile);
    const onFileChange = async (file: string) =>
      await replaceFile(config, file, options?.resolveFullPaths);
    filesWatcher.on('add', onFileChange);
    filesWatcher.on('change', onFileChange);
    tsconfigWatcher.on('change', () => {
      config.output.clear();
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

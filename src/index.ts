import { watch } from 'chokidar';
import { sync } from 'globby';
import { replaceAlias, replaceAliasString } from './helpers';
import {
  ReplaceTscAliasPathsOptions,
  IConfig,
  AliasReplacer,
  IProjectConfig,
  AliasReplacerArguments
} from './interfaces';
import { prepareConfig } from './helpers/config-preparer';

// export interfaces for api use.
export {
  ReplaceTscAliasPathsOptions,
  AliasReplacer,
  AliasReplacerArguments,
  IConfig,
  IProjectConfig
};

const DEFAULT_CONFIG = {
  watch: false,
  verbose: false,
  declarationDir: undefined,
  output: undefined,
  aliasTrie: undefined
};

export async function replaceTscAliasPaths(
  options: ReplaceTscAliasPathsOptions = { ...DEFAULT_CONFIG }
) {
  const config = await prepareConfig(options);
  const output = config.output;

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

export type SingleFileReplacer = (input: {
  fileContents: string;
  filePath: string;
}) => string;

export async function prepareSingleFileReplaceTscAliasPaths(
  options: ReplaceTscAliasPathsOptions = { ...DEFAULT_CONFIG }
): Promise<SingleFileReplacer> {
  const config = await prepareConfig(options);

  return ({ fileContents, filePath }) => {
    return replaceAliasString(
      config,
      filePath,
      fileContents,
      options?.resolveFullPaths
    );
  };
}

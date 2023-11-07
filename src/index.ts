import { watch } from 'chokidar';
import { sync } from 'globby';
import { pLimit } from 'plimit-lit';
import { prepareConfig, replaceAlias, replaceAliasString } from './helpers';
import {
  AliasReplacer,
  AliasReplacerArguments,
  IConfig,
  IOutput,
  IProjectConfig,
  ReplaceTscAliasPathsOptions
} from './interfaces';

// export interfaces for api use.
export {
  ReplaceTscAliasPathsOptions,
  AliasReplacer,
  AliasReplacerArguments,
  IConfig,
  IProjectConfig,
  IOutput
};

const defaultConfig = {
  watch: false,
  verbose: false,
  debug: false,
  declarationDir: undefined,
  output: undefined,
  aliasTrie: undefined
};

const OpenFilesLimit = pLimit(500);

/**
 * replaceTscAliasPaths replaces the aliases in the project.
 * @param {ReplaceTscAliasPathsOptions} options tsc-alias options.
 */
export async function replaceTscAliasPaths(
  options: ReplaceTscAliasPathsOptions = { ...defaultConfig }
) {
  const config = await prepareConfig(options);
  const output = config.output;

  // Finding files and changing alias paths
  const posixOutput = config.outPath.replace(/\\/g, '/').replace(/\/+$/g, '');
  const globPattern = [
    `${posixOutput}/**/*.${config.inputGlob}`,
    `!${posixOutput}/**/node_modules`
  ];
  output.debug('Search pattern:', globPattern);
  const files = sync(globPattern, {
    dot: true,
    onlyFiles: true
  });
  output.debug('Found files:', files);

  // Make array with promises for file changes
  // Wait for all promises to resolve
  const replaceList = await Promise.all(
    files.map((file) =>
      OpenFilesLimit(() =>
        replaceAlias(
          config,
          file,
          options?.resolveFullPaths,
          options?.resolveFullExtension
        )
      )
    )
  );

  // Count all changed files
  const replaceCount = replaceList.filter(Boolean).length;

  output.info(`${replaceCount} files were affected!`);
  if (options.watch) {
    output.verbose = true;
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
      aliasTrie: undefined
    });
  }
}

export type SingleFileReplacer = (input: {
  fileContents: string;
  filePath: string;
}) => string;

/**
 * prepareSingleFileReplaceTscAliasPaths prepares a SingleFileReplacer.
 * @param {ReplaceTscAliasPathsOptions} options tsc-alias options.
 * @returns {Promise<SingleFileReplacer>} a SingleFileReplacer to use for replacing aliases in a single file.
 */
export async function prepareSingleFileReplaceTscAliasPaths(
  options: ReplaceTscAliasPathsOptions = { ...defaultConfig }
): Promise<SingleFileReplacer> {
  const config = await prepareConfig(options);

  return ({ fileContents, filePath }) => {
    return replaceAliasString(
      config,
      filePath,
      fileContents,
      options?.resolveFullPaths,
      options?.resolveFullExtension
    );
  };
}

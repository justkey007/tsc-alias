import { Output, PathCache, TrieNode } from './utils';

export interface IRawTSConfig {
  extends?: string;
  compilerOptions?: ITSConfig;
  'tsc-alias': {
    replacers?: ReplacerOptions;
    resolveFullPaths?: boolean;
    verbose?: boolean;
  };
}

export type PathLike = {
  [key: string]: string[];
};

export type StringReplacer = (importStatement: string) => string;

export interface ITSConfig {
  baseUrl?: string;
  outDir?: string;
  declarationDir?: string;
  paths?: PathLike;
  replacers?: ReplacerOptions;
  resolveFullPaths?: boolean;
  verbose?: boolean;
}

export interface IConfig {
  configFile: string;
  baseUrl: string;
  outDir: string;
  configDir: string;
  outPath: string;
  confDirParentFolderName: string;
  hasExtraModule: boolean;
  configDirInOutPath: string;
  relConfDirPathInOutPath: string;
  pathCache: PathCache;
  output: Output;
  aliasTrie: TrieNode<Alias>;
  replacers: AliasReplacer[];
}

export interface ReplaceTscAliasPathsOptions {
  configFile?: string;
  outDir?: string;
  declarationDir?: string;
  watch?: boolean;
  verbose?: boolean;
  resolveFullPaths?: boolean;
  replacers?: string[];
  output?: Output;
}

export interface Alias {
  shouldPrefixMatchWildly: boolean;
  prefix: string;
  paths: AliasPath[];
}

export interface AliasPath {
  basePath: string;
  path: string;
  isExtra: boolean;
}

export type Assertion = (claim: any, message: string) => asserts claim;

export interface AliasReplacerArguments {
  orig: string;
  file: string;
  config: IConfig;
}

export type AliasReplacer = (args: AliasReplacerArguments) => string;

export interface ReplacerOptions {
  [key: string]: {
    enabled: boolean;
    file?: string;
  };
}

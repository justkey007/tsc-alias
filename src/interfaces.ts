export interface IRawTSConfig {
  extends?: string;
  compilerOptions?: ITSConfig;
}

export type PathLike = {
  [key: string]: string[];
};

export type StringReplacer = (importStatement: string) => string;

export interface ITSConfig {
  baseUrl?: string;
  outDir?: string;
  paths?: PathLike;
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
}

export interface ReplaceTscAliasPathsOptions {
  configFile?: string;
  outDir?: string;
  watch?: boolean;
  silent?: boolean;
  resolveFullPaths?: boolean;
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

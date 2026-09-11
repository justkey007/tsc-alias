import { IConfig, ReplacerOptions } from '../interfaces';

export interface IImportReplacersParams {
  /** the tsc-alias config object. */
  config: IConfig;
  /** the tsc-alias replacer options. */
  replacers: ReplacerOptions;
  /** array of filepaths to replacers from command-line. */
  cmdReplacers?: string[];
}

export interface IReplaceAliasParams {
  /** configuration */
  config: IConfig;
  /** path to the file to replace aliases in. */
  file: string;
  /** if tsc-alias should resolve the full path */
  resolveFullPath?: boolean;
  /** extension used when resolving the full path */
  resolveFullExtension?: string;
}

export interface IReplaceAliasStringParams extends IReplaceAliasParams {
  /** contents of the file to replace aliases in. */
  code: string;
}

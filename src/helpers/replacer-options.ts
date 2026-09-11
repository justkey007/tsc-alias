import { ReplacerOptions } from '../interfaces';

export function getDefaultReplacers(baseUrl?: string): ReplacerOptions {
  // List of default replacers.
  return {
    default: {
      enabled: true
    },
    'base-url': {
      enabled: !!baseUrl
    }
  };
}

export interface IMergeReplacersParams {
  defaultReplacers: ReplacerOptions;
  replacers: ReplacerOptions;
  cmdReplacers?: string[];
}

export function mergeReplacers(params: IMergeReplacersParams): ReplacerOptions {
  const { defaultReplacers, replacers, cmdReplacers } = params;

  // List of all replacers.
  const merged: ReplacerOptions = {
    ...defaultReplacers,
    ...replacers
  };

  // Added replacers to list from command-line filepaths.
  cmdReplacers?.forEach((file) => {
    merged[file] = {
      enabled: true,
      file
    };
  });

  return merged;
}

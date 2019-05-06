import { readdirSync, statSync } from 'fs';
import { dirname, resolve } from 'path';


export interface IRawTSConfig {
  extends?: string;
  compilerOptions?: {
    baseUrl?: string;
    outDir?: string;
    paths?: { [key: string]: string[] };
  };
}

export interface ITSConfig {
  baseUrl?: string;
  outDir?: string;
  paths?: { [key: string]: string[] };
}

export const mapPaths = (
  paths: { [key: string]: string[] },
  mapper: (x: string) => string
): { [key: string]: string[] } => {
  const dest = {} as { [key: string]: string[] };
  Object.keys(paths).forEach((key) => {
    dest[key] = paths[key].map(mapper);
  });
  return dest;
};

export const loadConfig = (file: string): ITSConfig => {
  const {
    extends: ext,
    compilerOptions: { baseUrl, outDir, paths } = {
      baseUrl: undefined,
      outDir: undefined,
      paths: undefined,
    },
  } = require(file) as IRawTSConfig;

  const config: ITSConfig = {};
  if (baseUrl) {
    config.baseUrl = baseUrl;
  }
  if (outDir) {
    config.outDir = outDir;
  }
  if (paths) {
    config.paths = paths;
  }

  if (ext) {
    const parentConfig = loadConfig(resolve(dirname(file), ext));
    return {
      ...parentConfig,
      ...config,
    };
  }

  return config;
};

export function walk(dir: string, stopOn: string = ''): string[] {
  let results: string[] = [];
  const list = readdirSync(dir);

  for (let file of list) {
    const dirName = file;
    file = dir + '/' + file;
    if (dirName === stopOn) {
      results.push(file);
      break;
    }
    const stat = statSync(file); stopOn;
    if (stat && stat.isDirectory() && dirName !== stopOn) {
      /* Recurse into a subdirectory */
      results = results.concat(walk(file, stopOn));
      results.push(file);
    } else {
      /* Is a file */
    }
  }
  return results;
}

export function getPathThatEndsUp(paths: string[], ending: string): string | undefined {
  let splitPath: string[]; let found = false; let i = 0;
  while (!found && i < paths.length) {
    splitPath = paths[i].split('/');
    if (splitPath.lastIndexOf(ending) === splitPath.length - 1) {
      found = true;
    }
    i++;
  }
  if (found) {
    return paths[i - 1];
  }
  return undefined;
}
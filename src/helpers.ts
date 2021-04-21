import * as FileUtils from '@jfonx/file-utils';
import * as findNodeModulesPath from 'find-node-modules';
import * as fs from 'fs';
import { sync } from 'globby';
import { dirname, join } from 'path';

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
      paths: undefined
    }
  } = FileUtils.toObject(file) as IRawTSConfig;

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
    let parentConfig: ITSConfig;
    if (ext.startsWith('.')) {
      parentConfig = loadConfig(join(dirname(file), ext));
    } else {
      parentConfig = loadConfig(resolveTsConfigExtendsPath(ext, file));
    }
    return {
      ...parentConfig,
      ...config
    };
  }

  return config;
};

export function resolveTsConfigExtendsPath(ext: string, file: string): string {
  const tsConfigDir = dirname(file);
  const node_modules = findNodeModulesPath({ cwd: tsConfigDir })[0];
  const targetPath = join(tsConfigDir, node_modules, ext);
  if (ext.endsWith('.json')) {
    return targetPath;
  }
  let isDirectory = false;
  try {
    isDirectory = fs.lstatSync(targetPath).isDirectory();
  } catch (err) {}
  return isDirectory ? join(targetPath, 'tsconfig.json') : `${targetPath}.json`;
}

export function getProjectDirPathInOutDir(
  outDir: string,
  projectDir: string
): string | undefined {
  const dirs = sync(
    [
      `${outDir}/**/${projectDir}`,
      `!${outDir}/**/${projectDir}/**/${projectDir}`,
      `!${outDir}/**/node_modules`
    ],
    {
      dot: true,
      onlyDirectories: true
    }
  );

  /* Rechercher le chemin le plus long */
  dirs.sort((dirA, dirB) => {
    return dirB.split('/').length - dirA.split('/').length;
  });
  return dirs[0];
}

export function existsResolvedAlias(path: string): boolean {
  if (fs.existsSync(path)) return true;

  const globPattern = [`${path}.{js,jsx}`];
  const files = sync(globPattern, {
    dot: true,
    onlyFiles: true
  });

  if (files.length) return true;
  return false;
}

export function getAbsoluteAliasPath(
  basePath: string,
  aliasPath: string
): string {
  const aliasPathParts = aliasPath
    .split('/')
    .filter((part) => !part.match(/^\.$|^\s*$/));

  let aliasPathPart = aliasPathParts.shift() || '';

  let pathExists: boolean;
  while (
    !(pathExists = fs.existsSync(join(basePath, aliasPathPart))) &&
    aliasPathParts.length
  ) {
    aliasPathPart = aliasPathParts.shift();
  }

  return join(
    basePath,
    pathExists ? aliasPathPart : '',
    aliasPathParts.join('/')
  );
}

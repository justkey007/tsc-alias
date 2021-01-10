import { loadSync } from 'tsconfig'
import * as findNodeModulesPath from 'find-node-modules';
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
      paths: undefined,
    },
  } = loadSync(file).config as IRawTSConfig;

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
      const tsConfigDir = dirname(file);
      const node_modules = findNodeModulesPath({ cwd: tsConfigDir })[0];
      const nodeModulesTsConfig = !ext.includes('.json') ? `${ext}.json` : ext;
      parentConfig = loadConfig(
        join(tsConfigDir, node_modules, nodeModulesTsConfig)
      );
    }
    return {
      ...parentConfig,
      ...config,
    };
  }

  return config;
};

export function getProjectDirPathInOutDir(
  outDir: string,
  projectDir: string
): string | undefined {
  const dirs = sync(
    [
      `${outDir}/**/${projectDir}`,
      `!${outDir}/**/${projectDir}/**/${projectDir}`,
      `!${outDir}/**/node_modules`,
    ],
    {
      dot: true,
      onlyDirectories: true,
    }
  );

  /* Rechercher le chemin le plus long */
  dirs.sort((dirA, dirB) => {
    return dirB.split('/').length - dirA.split('/').length;
  });
  return dirs[0];
}

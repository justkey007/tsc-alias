import { Json } from 'mylas';
import * as findNodeModulesPath from 'find-node-modules';
import * as fs from 'fs';
import { dirname, join } from 'path';
import { IRawTSConfig, ITSConfig } from '../interfaces';

export const loadConfig = (file: string): ITSConfig => {
  if (!fs.existsSync(file)) {
    console.log(
      //[BgRed] Error: [Reset] [FgRed_]File ${file} not found[Reset]
      `\x1b[41m Error: \x1b[0m \x1b[31mFile ${file} not found\x1b[0m`
    );
    process.exit();
  }
  const {
    extends: ext,
    compilerOptions: { baseUrl, outDir, declarationDir, paths } = {
      baseUrl: undefined,
      outDir: undefined,
      declarationDir: undefined,
      paths: undefined
    },
    'tsc-alias': TSCReplacers
  } = Json.loadS<IRawTSConfig>(file, true);

  const config: ITSConfig = {};
  if (baseUrl) config.baseUrl = baseUrl;
  if (outDir) config.outDir = outDir;
  if (paths) config.paths = paths;
  if (declarationDir) config.declarationDir = declarationDir;
  if (TSCReplacers?.replacers) config.replacers = TSCReplacers.replacers;

  if (ext) {
    return {
      ...(ext.startsWith('.')
        ? loadConfig(
            join(dirname(file), ext.endsWith('.json') ? ext : `${ext}.json`)
          )
        : loadConfig(resolveTsConfigExtendsPath(ext, file))),
      ...config
    };
  }

  return config;
};

export function resolveTsConfigExtendsPath(ext: string, file: string): string {
  const tsConfigDir = dirname(file);
  const node_modules: string[] = findNodeModulesPath({ cwd: tsConfigDir }); // Getting all node_modules directories.
  const targetPaths = node_modules.map((v) => join(tsConfigDir, v, ext)); // Mapping node_modules to target paths.

  // Recursively checking ancestor directories for tsconfig.
  for (const targetPath of targetPaths) {
    if (ext.endsWith('.json')) {
      // Check if the file exists.
      if (fs.existsSync(targetPath)) {
        return targetPath;
      } else {
        continue; // Continue checking when ext is a file but not yet found.
      }
    }
    let isDirectory = false;
    try {
      isDirectory = fs.lstatSync(targetPath).isDirectory();
    } catch (err) {}
    if (isDirectory) {
      return join(targetPath, 'tsconfig.json');
    } else {
      // When target is not a file nor directory check with '.json' extension.
      if (fs.existsSync(`${targetPath}.json`)) {
        return `${targetPath}.json`;
      }
    }
  }
}

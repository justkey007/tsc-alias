/**
 * @file
 * Helper functions for detecting project directories in output paths.
 */

import { sync } from 'globby';
import { relative } from 'path';
import { IProjectConfig } from '../interfaces';
import { selectBestProjectPath } from './path-matcher';
import normalizePath = require('normalize-path');

/**
 * getProjectDirPathInOutDir finds the configDirInOutPath.
 * @param {string} outDir outDir loaded from tsconfig.
 * @param {string} projectDir projectDir loaded from tsconfig.
 * @returns {string | undefined} the configDirInOutPath.
 */
export function getProjectDirPathInOutDir(outDir: string, projectDir: string): string | undefined {
  const posixOutput = outDir.replace(/\\/g, '/');
  const dirs = sync(
    [
      `${posixOutput}/**/${projectDir}`,
      `!${posixOutput}/**/${projectDir}/**/${projectDir}`,
      `!${posixOutput}/**/node_modules`
    ],
    {
      dot: true,
      onlyDirectories: true
    }
  );

  return selectBestProjectPath(outDir, projectDir, dirs);
}

/**
 * relativeOutPathToConfigDir finds relative path access of configDir in outPath.
 * @param {IProjectConfig} config project configuration object.
 */
export function relativeOutPathToConfigDir(config: IProjectConfig): void {
  config.configDirInOutPath = getProjectDirPathInOutDir(config.outPath, config.confDirParentFolderName);

  if (!config.configDirInOutPath) return;

  config.hasExtraModule = true;
  const stepsbackPath = relative(config.configDirInOutPath, config.outPath);
  const splitStepBackPath = normalizePath(stepsbackPath).split('/');
  const nbOfStepBack = splitStepBackPath.length;
  const splitConfDirInOutPath = config.configDirInOutPath.split('/');

  let i = 1;
  const splitRelPath: string[] = [];
  while (i <= nbOfStepBack) {
    splitRelPath.unshift(splitConfDirInOutPath[splitConfDirInOutPath.length - i]);
    i++;
  }
  config.relConfDirPathInOutPath = splitRelPath.join('/');
}

/**
 * @file
 * Helper for resolving paths through TypeScript project references.
 */

import { existsSync } from 'fs';
import { Json } from 'mylas';
import { dirname, isAbsolute, join, relative, resolve } from 'path';
import { getImportablePath } from '../utils/path-validator';
import normalizePath = require('normalize-path');

export interface IProjectReferenceInfo {
  rootDir: string;
  outDir: string;
}

interface IResolvedProjectReferenceInfo extends IProjectReferenceInfo {
  configFile: string;
}

interface IProjectReferenceLoadResult {
  hasReferences: boolean;
  references: IResolvedProjectReferenceInfo[];
  missing: string[];
}

export interface IFindMatchingRefParams {
  configFile?: string;
  sourcePath: string;
}

export interface IResolveRefTargetParams {
  reference: IProjectReferenceInfo;
  sourcePath: string;
  fileExtensions: string[];
}

interface IRawConfig {
  compilerOptions?: { rootDir?: string; outDir?: string };
  references?: Array<{ path: string }>;
}

const refCache = new Map<string, IProjectReferenceLoadResult>();

function emptyReferenceLoadResult(): IProjectReferenceLoadResult {
  return { hasReferences: false, references: [], missing: [] };
}

interface ILoadReferenceResult {
  reference?: IResolvedProjectReferenceInfo;
  missing?: string;
}
function loadReference(refPath: string, baseDir: string): ILoadReferenceResult {
  const refFile = resolveReferencePath(refPath, baseDir);
  if (!existsSync(refFile)) return { missing: refFile };

  const refRaw = Json.loadS<IRawConfig>(refFile, true);
  const refDir = dirname(refFile);
  const options = refRaw?.compilerOptions || {};
  const rootDir = resolve(refDir, options.rootDir || '.');
  const outDir = resolve(refDir, options.outDir || '.');

  return {
    reference: {
      configFile: refFile,
      rootDir: normalizePath(rootDir),
      outDir: normalizePath(outDir)
    }
  };
}

function loadUncachedProjectReferences(configFile: string): IProjectReferenceLoadResult {
  const raw = Json.loadS<IRawConfig>(configFile, true);
  const results = (raw?.references || []).map(({ path }) => loadReference(path, dirname(configFile)));

  return {
    hasReferences: Boolean(raw?.references?.length),
    references: results.flatMap(({ reference }) => (reference ? [reference] : [])),
    missing: results.flatMap(({ missing }) => (missing ? [missing] : []))
  };
}

export function resolveReferencePath(refPath: string, baseDir: string): string {
  const abs = isAbsolute(refPath) ? refPath : resolve(baseDir, refPath);
  if (existsSync(join(abs, 'tsconfig.json'))) return join(abs, 'tsconfig.json');
  return abs;
}

export function loadProjectReferenceDetails(configFile?: string): IProjectReferenceLoadResult {
  if (!configFile || !existsSync(configFile)) return emptyReferenceLoadResult();
  const cached = refCache.get(configFile);
  if (cached) return cached;

  const result = loadUncachedProjectReferences(configFile);
  refCache.set(configFile, result);
  return result;
}

export function loadProjectReferences(configFile?: string): IProjectReferenceInfo[] {
  return loadProjectReferenceDetails(configFile).references.map(({ rootDir, outDir }) => ({
    rootDir,
    outDir
  }));
}

export function findMatchingReference(params: IFindMatchingRefParams): IProjectReferenceInfo | null {
  const { configFile, sourcePath } = params;
  const references = loadProjectReferences(configFile);
  const normalizedSource = normalizePath(sourcePath);

  for (const ref of references) {
    const rel = normalizePath(relative(ref.rootDir, normalizedSource));
    if (!rel.startsWith('..') && !isAbsolute(rel)) return ref;
  }
  return null;
}

export function resolveReferenceTargetPath(params: IResolveRefTargetParams): string | null {
  const { reference, sourcePath, fileExtensions } = params;
  const rel = normalizePath(relative(reference.rootDir, normalizePath(sourcePath)));
  const candidateOut = resolve(reference.outDir, rel);
  return getImportablePath(candidateOut, fileExtensions);
}

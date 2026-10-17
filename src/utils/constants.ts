/** Default extensions used when resolving emitted files. */
export const DEFAULT_FILE_EXTENSIONS = ['js', 'json', 'jsx', 'cjs', 'mjs', 'd.ts', 'd.tsx', 'd.cts', 'd.mts'] as const;

/** Runtime extensions, in resolution preference order. */
export const DEFAULT_RUNTIME_EXTENSIONS = DEFAULT_FILE_EXTENSIONS.filter(
  (extension) => !extension.startsWith('d.')
).map((extension) => `.${extension}`);

export const DEFAULT_IMPORT_EXTENSION = DEFAULT_RUNTIME_EXTENSIONS[0];

/** Prefix used by scoped npm package names, such as @scope/package. */
export const SCOPED_PACKAGE_PREFIX = '@';

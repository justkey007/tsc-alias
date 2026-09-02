/**
 * @file
 * Ancestor suffix match helper for identifying project directory in output folder.
 */

interface IPathMatch {
  matchLength: number;
  dir: string;
}

function calculateMatchLength(dirParts: string[], posixOutParts: string[], lastIndex: number): number {
  let length = 0;
  for (let i = dirParts.length - 1; i >= 0; --i) {
    if (dirParts[i] !== posixOutParts[lastIndex - length]) {
      break;
    }
    length++;
  }
  return length;
}

/**
 * Selects the path with the highest ancestor suffix match against the project directory.
 */
export function selectBestProjectPath(outDir: string, projectDir: string, dirs: string[]): string | undefined {
  if (dirs.length === 0) return undefined;
  const posixOutParts = outDir.replace(/\\/g, '/').split('/');
  const lastIndex = posixOutParts.lastIndexOf(projectDir);

  const bestMatch = dirs.reduce<IPathMatch>(
    (longest, dir) => {
      const parts = dir.split('/');
      const length = calculateMatchLength(parts, posixOutParts, lastIndex);
      if (length > longest.matchLength) {
        return { matchLength: length, dir };
      }
      return longest;
    },
    { matchLength: 0, dir: dirs[0] }
  );

  return bestMatch.dir;
}

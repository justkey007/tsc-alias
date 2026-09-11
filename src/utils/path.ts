export function splitPathByParentSteps(filePath: string) {
  // This regex captures all consecutive "../" or "..\" at the start of the path
  const match = filePath.match(/^((?:\.\.(?:\/|\\))+)(.*)/);

  if (!match) {
    return {
      parentSteps: '',
      remainingPath: filePath
    };
  }

  return {
    parentSteps: match[1],
    remainingPath: match[2]
  };
}

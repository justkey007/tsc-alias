/**
 * @file
 * Regex patterns for matching ESM and CommonJS import/require statements.
 */

const anyQuote = `["']`;
const pathStringContent = `[^"'\r\n]+`;
const importString = `(?:${anyQuote}${pathStringContent}${anyQuote})`;

const funcStyle = `(?:\\b(?:import|require)\\s*\\(\\s*(\\/\\*.*\\*\\/\\s*)?${importString}(?:\\s*,[\\s\\S]*?)?\\s*\\))`;
const globalStyle = `(?:\\bimport\\s+${importString})`;
const globalMinimizedStyle = `(?:\\bimport${importString})`;
const fromStyle = `(?:\\bfrom\\s+${importString})`;
const fromMinimizedStyle = `(?:\\bfrom${importString})`;
const moduleStyle = `(?:\\bmodule\\s+${importString})`;

const importRegexString = `(?:${[
  funcStyle,
  globalStyle,
  globalMinimizedStyle,
  fromStyle,
  fromMinimizedStyle,
  moduleStyle
].join('|')})`;

export function newStringRegex(): RegExp {
  return new RegExp(`(?<pathWithQuotes>${anyQuote}(?<path>${pathStringContent})${anyQuote})`);
}

export function newImportStatementRegex(flags = ''): RegExp {
  return new RegExp(importRegexString, flags);
}

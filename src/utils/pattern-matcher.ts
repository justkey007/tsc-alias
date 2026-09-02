/**
 * @file
 * Helper functions for parsing, matching and substituting wildcard patterns.
 */

export interface IWildcardPattern {
  prefix: string;
  suffix: string;
  hasWildcard: boolean;
}

export interface IMatchWildcardParams {
  pattern: IWildcardPattern;
  text: string;
}

export interface ISubstituteWildcardParams {
  pattern: IWildcardPattern;
  starValue: string;
}

export function parseWildcardPattern(raw: string): IWildcardPattern {
  const starIndex = raw.indexOf('*');
  if (starIndex === -1) {
    return { prefix: raw, suffix: '', hasWildcard: false };
  }

  return {
    prefix: raw.slice(0, starIndex),
    suffix: raw.slice(starIndex + 1),
    hasWildcard: true
  };
}

export function matchWildcard(params: IMatchWildcardParams): { matched: boolean; starValue: string } {
  const { pattern, text } = params;

  if (!pattern.hasWildcard) {
    if (text === pattern.prefix) {
      return { matched: true, starValue: '' };
    }
    if (text.startsWith(`${pattern.prefix}/`)) {
      return {
        matched: true,
        starValue: text.slice(pattern.prefix.length + 1)
      };
    }
    return { matched: false, starValue: '' };
  }

  const minLength = pattern.prefix.length + pattern.suffix.length;
  const startsProperly = text.startsWith(pattern.prefix);
  const endsProperly = text.endsWith(pattern.suffix);

  if (!startsProperly || !endsProperly || text.length < minLength) {
    return { matched: false, starValue: '' };
  }

  const endCut = text.length - pattern.suffix.length;
  const starValue = text.slice(pattern.prefix.length, endCut);
  return { matched: true, starValue };
}

export function substituteWildcard(params: ISubstituteWildcardParams): string {
  const { pattern, starValue } = params;
  if (!pattern.hasWildcard) {
    return pattern.prefix;
  }
  return `${pattern.prefix}${starValue}${pattern.suffix}`;
}

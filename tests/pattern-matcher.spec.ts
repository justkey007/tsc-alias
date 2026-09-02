import { matchWildcard, parseWildcardPattern, substituteWildcard } from '../src/utils/pattern-matcher';

describe('pattern-matcher', () => {
  describe('parseWildcardPattern', () => {
    it('should parse standard wildcard at the end', () => {
      const pattern = parseWildcardPattern('@controllers/*');
      expect(pattern).toEqual({
        prefix: '@controllers/',
        suffix: '',
        hasWildcard: true
      });
    });

    it('should parse wildcard with suffix in target template', () => {
      const pattern = parseWildcardPattern('./src/controllers/*.controller');
      expect(pattern).toEqual({
        prefix: './src/controllers/',
        suffix: '.controller',
        hasWildcard: true
      });
    });

    it('should parse wildcard with suffix in alias key', () => {
      const pattern = parseWildcardPattern('*-controller');
      expect(pattern).toEqual({
        prefix: '',
        suffix: '-controller',
        hasWildcard: true
      });
    });

    it('should parse wildcard in the middle', () => {
      const pattern = parseWildcardPattern('@api/*/v1');
      expect(pattern).toEqual({
        prefix: '@api/',
        suffix: '/v1',
        hasWildcard: true
      });
    });

    it('should parse pattern without wildcard', () => {
      const pattern = parseWildcardPattern('@router');
      expect(pattern).toEqual({
        prefix: '@router',
        suffix: '',
        hasWildcard: false
      });
    });
  });

  describe('matchWildcard and substituteWildcard', () => {
    it('should match and substitute suffix in target (issue 233)', () => {
      const keyPattern = parseWildcardPattern('@controllers/*');
      const targetPattern = parseWildcardPattern('./src/controllers/*.controller');

      const match = matchWildcard({
        pattern: keyPattern,
        text: '@controllers/app'
      });
      expect(match.matched).toBe(true);
      expect(match.starValue).toBe('app');

      const substituted = substituteWildcard({
        pattern: targetPattern,
        starValue: match.starValue
      });
      expect(substituted).toBe('./src/controllers/app.controller');
    });

    it('should match and substitute suffix in key', () => {
      const keyPattern = parseWildcardPattern('*-controller');
      const targetPattern = parseWildcardPattern('./src/controllers/*');

      const match = matchWildcard({
        pattern: keyPattern,
        text: 'app-controller'
      });
      expect(match.matched).toBe(true);
      expect(match.starValue).toBe('app');

      const substituted = substituteWildcard({
        pattern: targetPattern,
        starValue: match.starValue
      });
      expect(substituted).toBe('./src/controllers/app');
    });

    it('should match and substitute wildcard in the middle', () => {
      const keyPattern = parseWildcardPattern('@api/*/v1');
      const targetPattern = parseWildcardPattern('./src/endpoints/*/v1');

      const match = matchWildcard({
        pattern: keyPattern,
        text: '@api/users/v1'
      });
      expect(match.matched).toBe(true);
      expect(match.starValue).toBe('users');

      const substituted = substituteWildcard({
        pattern: targetPattern,
        starValue: match.starValue
      });
      expect(substituted).toBe('./src/endpoints/users/v1');
    });

    it('should match exact pattern without wildcard', () => {
      const pattern = parseWildcardPattern('@router');

      const match = matchWildcard({ pattern, text: '@router' });
      expect(match.matched).toBe(true);
      expect(match.starValue).toBe('');

      const substituted = substituteWildcard({
        pattern,
        starValue: match.starValue
      });
      expect(substituted).toBe('@router');
    });

    it('should reject non-matching string', () => {
      const pattern = parseWildcardPattern('@controllers/*');
      const match = matchWildcard({ pattern, text: '@services/app' });
      expect(match.matched).toBe(false);
    });
  });
});

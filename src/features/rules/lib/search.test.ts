import { describe, expect, it } from 'vitest';
import { buildSnippet, escapeRegExp, searchRules } from './search';

describe('searchRules', () => {
  it('ranks the nobs subheading first for "nobs"', () => {
    const results = searchRules('nobs');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].sectionId).toBe('scoring');
    expect(results[0].chunkTitle.toLowerCase()).toContain('nobs');
  });

  it('finds "the go" content in pegging', () => {
    const results = searchRules('go');
    expect(results.some((result) => result.sectionId === 'pegging')).toBe(true);
  });

  it('returns an empty array for a blank query', () => {
    expect(searchRules('')).toEqual([]);
    expect(searchRules('   ')).toEqual([]);
  });

  it('does not throw for queries containing regex special characters', () => {
    expect(() => searchRules('(go')).not.toThrow();
    expect(() => searchRules('go*')).not.toThrow();
    expect(() => searchRules('[fifteen]')).not.toThrow();
    expect(() => searchRules('go.*+?^${}()|')).not.toThrow();
  });

  it('is fuzzy/prefix tolerant of a partial word', () => {
    const results = searchRules('skun');
    expect(results.some((result) => result.sectionId === 'winning')).toBe(true);
  });
});

describe('buildSnippet', () => {
  it('centers a snippet on the first match', () => {
    const text = `${'x'.repeat(200)} the-target-word ${'y'.repeat(200)}`;
    const snippet = buildSnippet(text, 'target');
    expect(snippet).toContain('target');
    expect(snippet.length).toBeLessThan(text.length);
  });

  it('falls back to the start of the text when there is no literal match', () => {
    const text = 'abcdefg'.repeat(40);
    const snippet = buildSnippet(text, 'zzz-not-present');
    expect(snippet.startsWith('abcdefg')).toBe(true);
  });
});

describe('escapeRegExp', () => {
  it('escapes every regex metacharacter', () => {
    expect(escapeRegExp('a.b*c?d')).toBe('a\\.b\\*c\\?d');
    expect(new RegExp(escapeRegExp('(go)')).test('(go)')).toBe(true);
  });
});

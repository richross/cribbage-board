import { describe, expect, it } from 'vitest';
import { createSlugger, slugify } from './slug';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('The Go')).toBe('the-go');
  });

  it('strips punctuation', () => {
    expect(slugify('His Nobs, and His Heels!')).toBe('his-nobs-and-his-heels');
  });

  it('collapses runs of non-alphanumeric characters', () => {
    expect(slugify('Fifteens: count every combination')).toBe('fifteens-count-every-combination');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  --Scoring--  ')).toBe('scoring');
  });

  it('strips curly apostrophes without leaving a hyphen', () => {
    expect(slugify("Who's playing?")).toBe('whos-playing');
  });
});

describe('createSlugger', () => {
  it('returns the plain slug the first time a heading is seen', () => {
    const slugger = createSlugger();
    expect(slugger('Example')).toBe('example');
  });

  it('de-duplicates repeated headings within one document', () => {
    const slugger = createSlugger();
    expect(slugger('Example')).toBe('example');
    expect(slugger('Example')).toBe('example-2');
    expect(slugger('Example')).toBe('example-3');
  });

  it('tracks slugs independently per instance', () => {
    const a = createSlugger();
    const b = createSlugger();
    expect(a('Scoring')).toBe('scoring');
    expect(b('Scoring')).toBe('scoring');
  });
});

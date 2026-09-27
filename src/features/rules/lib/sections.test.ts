import { describe, expect, it } from 'vitest';
import { getAdjacentSections, getSectionById, rulesSections } from './sections';

describe('rulesSections', () => {
  it('loads all 12 content files', () => {
    expect(rulesSections).toHaveLength(12);
  });

  it('every section has a title, order, summary and at least one heading', () => {
    for (const section of rulesSections) {
      expect(section.title.length).toBeGreaterThan(0);
      expect(typeof section.order).toBe('number');
      expect(section.summary.length).toBeGreaterThan(0);
      expect(section.headings.length).toBeGreaterThan(0);
    }
  });

  it('is sorted by order', () => {
    const orders = rulesSections.map((section) => section.order);
    const sorted = [...orders].sort((a, b) => a - b);
    expect(orders).toEqual(sorted);
  });

  it('includes the expected section ids', () => {
    const ids = rulesSections.map((section) => section.id).sort();
    expect(ids).toEqual(
      [
        'crib',
        'deal',
        'glossary',
        'muggins',
        'overview',
        'pegging',
        'scoring',
        'show',
        'starter',
        'teams',
        'three-players',
        'winning',
      ].sort(),
    );
  });

  it('overview is first and glossary is last by order', () => {
    expect(rulesSections[0].id).toBe('overview');
    expect(rulesSections[rulesSections.length - 1].id).toBe('glossary');
  });
});

describe('getSectionById', () => {
  it('finds a known section', () => {
    expect(getSectionById('pegging')?.title).toBe('Pegging');
  });

  it('returns undefined for an unknown section', () => {
    expect(getSectionById('not-a-real-section')).toBeUndefined();
  });
});

describe('getAdjacentSections', () => {
  it('returns prev and next for a middle section', () => {
    const { prev, next } = getAdjacentSections('pegging');
    expect(prev?.id).toBeDefined();
    expect(next?.id).toBeDefined();
  });

  it('has no prev for the first section', () => {
    const { prev } = getAdjacentSections(rulesSections[0].id);
    expect(prev).toBeUndefined();
  });

  it('has no next for the last section', () => {
    const { next } = getAdjacentSections(rulesSections[rulesSections.length - 1].id);
    expect(next).toBeUndefined();
  });

  it('returns an empty object for an unknown section', () => {
    expect(getAdjacentSections('nope')).toEqual({});
  });
});

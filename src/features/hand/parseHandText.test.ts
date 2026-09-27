import { describe, expect, it } from 'vitest';
import { parseHandText } from './parseHandText';

describe('parseHandText', () => {
  it('parses 4 hand cards + starter from a space-separated string', () => {
    const result = parseHandText('5h 5c 5d jh 5s');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.hand).toEqual([
        { rank: 5, suit: 'H' },
        { rank: 5, suit: 'C' },
        { rank: 5, suit: 'D' },
        { rank: 11, suit: 'H' },
      ]);
      expect(result.starter).toEqual({ rank: 5, suit: 'S' });
    }
  });

  it('reports an error when the count is not exactly 5', () => {
    const result = parseHandText('5h 5c 5d');
    expect(result).toEqual({ ok: false, error: 'Enter exactly 5 cards (4 hand + starter) — got 3.' });
  });

  it('reports an error for an unreadable token', () => {
    const result = parseHandText('5h 5c 5d zz 5s');
    expect(result).toEqual({ ok: false, error: `Couldn't read "zz" as a card.` });
  });

  it('reports an error for a duplicate card', () => {
    const result = parseHandText('5h 5c 5d jh 5h');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/^Duplicate card:/);
    }
  });
});

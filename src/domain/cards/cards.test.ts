import { describe, expect, it } from 'vitest';
import {
  cardId,
  cardValue,
  formatCard,
  fullDeck,
  isRed,
  parseCard,
  rankLabel,
  sameCard,
  suitName,
  suitSymbol,
  type Card,
} from './index';

describe('cards', () => {
  it('cardId formats rank+suit with 10 unabbreviated', () => {
    expect(cardId({ rank: 5, suit: 'H' })).toBe('5H');
    expect(cardId({ rank: 10, suit: 'S' })).toBe('10S');
    expect(cardId({ rank: 11, suit: 'D' })).toBe('JD');
    expect(cardId({ rank: 1, suit: 'C' })).toBe('AC');
    expect(cardId({ rank: 12, suit: 'S' })).toBe('QS');
    expect(cardId({ rank: 13, suit: 'H' })).toBe('KH');
  });

  it('parseCard parses common formats case-insensitively', () => {
    expect(parseCard('5h')).toEqual({ rank: 5, suit: 'H' });
    expect(parseCard('10S')).toEqual({ rank: 10, suit: 'S' });
    expect(parseCard('QD')).toEqual({ rank: 12, suit: 'D' });
    expect(parseCard('ac')).toEqual({ rank: 1, suit: 'C' });
    expect(parseCard('jh')).toEqual({ rank: 11, suit: 'H' });
    expect(parseCard('kh')).toEqual({ rank: 13, suit: 'H' });
  });

  it('parseCard returns undefined for invalid input', () => {
    expect(parseCard('')).toBeUndefined();
    expect(parseCard('1Z')).toBeUndefined();
    expect(parseCard('15H')).toBeUndefined();
    expect(parseCard('X')).toBeUndefined();
    expect(parseCard('99S')).toBeUndefined();
  });

  it('cardValue: A=1, 2-10 face value, J/Q/K=10', () => {
    expect(cardValue({ rank: 1, suit: 'S' })).toBe(1);
    expect(cardValue({ rank: 9, suit: 'S' })).toBe(9);
    expect(cardValue({ rank: 10, suit: 'S' })).toBe(10);
    expect(cardValue({ rank: 11, suit: 'S' })).toBe(10);
    expect(cardValue({ rank: 12, suit: 'S' })).toBe(10);
    expect(cardValue({ rank: 13, suit: 'S' })).toBe(10);
  });

  it('rankLabel produces A,2..10,J,Q,K', () => {
    expect(rankLabel(1)).toBe('A');
    expect(rankLabel(7)).toBe('7');
    expect(rankLabel(10)).toBe('10');
    expect(rankLabel(11)).toBe('J');
    expect(rankLabel(12)).toBe('Q');
    expect(rankLabel(13)).toBe('K');
  });

  it('suitSymbol / suitName / isRed', () => {
    expect(suitSymbol('S')).toBe('♠');
    expect(suitSymbol('H')).toBe('♥');
    expect(suitSymbol('D')).toBe('♦');
    expect(suitSymbol('C')).toBe('♣');
    expect(suitName('S')).toBe('Spades');
    expect(isRed({ rank: 5, suit: 'H' })).toBe(true);
    expect(isRed({ rank: 5, suit: 'D' })).toBe(true);
    expect(isRed({ rank: 5, suit: 'S' })).toBe(false);
    expect(isRed({ rank: 5, suit: 'C' })).toBe(false);
  });

  it('formatCard combines rank label and suit symbol', () => {
    expect(formatCard({ rank: 5, suit: 'H' })).toBe('5♥');
    expect(formatCard({ rank: 10, suit: 'S' })).toBe('10♠');
    expect(formatCard({ rank: 11, suit: 'D' })).toBe('J♦');
  });

  it('fullDeck has 52 unique cards in a stable order', () => {
    const deck = fullDeck();
    expect(deck).toHaveLength(52);
    const ids = deck.map(cardId);
    expect(new Set(ids).size).toBe(52);
    // Stable order: suits S,H,D,C, ranks A..K within each suit.
    expect(deck[0]).toEqual({ rank: 1, suit: 'S' });
    expect(deck[12]).toEqual({ rank: 13, suit: 'S' });
    expect(deck[13]).toEqual({ rank: 1, suit: 'H' });
    expect(deck[51]).toEqual({ rank: 13, suit: 'C' });
    // Calling again produces the same order (stability).
    expect(fullDeck()).toEqual(deck);
  });

  it('sameCard compares rank and suit', () => {
    const a: Card = { rank: 5, suit: 'H' };
    const b: Card = { rank: 5, suit: 'H' };
    const c: Card = { rank: 5, suit: 'S' };
    expect(sameCard(a, b)).toBe(true);
    expect(sameCard(a, c)).toBe(false);
  });
});

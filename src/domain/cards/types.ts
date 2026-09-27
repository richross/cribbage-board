/** Pure cribbage card types and helpers (no React, no DOM). */

/** Suit identifiers, ordered S, H, D, C for deterministic sorting. */
export type Suit = 'S' | 'H' | 'D' | 'C';

/** Rank values, ace low (1) through king (13). */
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

/** A single playing card. */
export interface Card {
  rank: Rank;
  suit: Suit;
}

/** Suits ordered S, H, D, C — used for deterministic sorting everywhere. */
export const SUIT_ORDER: readonly Suit[] = ['S', 'H', 'D', 'C'];

const RANK_LABELS: Record<Rank, string> = {
  1: 'A',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
};

const SUIT_SYMBOLS: Record<Suit, string> = {
  S: '♠',
  H: '♥',
  D: '♦',
  C: '♣',
};

const SUIT_NAMES: Record<Suit, string> = {
  S: 'Spades',
  H: 'Hearts',
  D: 'Diamonds',
  C: 'Clubs',
};

/** Human readable rank label, e.g. "A", "10", "J", "Q", "K". */
export function rankLabel(rank: Rank): string {
  return RANK_LABELS[rank];
}

/** Unicode suit symbol, e.g. "♠". */
export function suitSymbol(suit: Suit): string {
  return SUIT_SYMBOLS[suit];
}

/** Full suit name, e.g. "Spades". */
export function suitName(suit: Suit): string {
  return SUIT_NAMES[suit];
}

/** True for hearts and diamonds. */
export function isRed(card: Card): boolean {
  return card.suit === 'H' || card.suit === 'D';
}

/** Stable identifier for a card, e.g. "5H", "10S", "JD", "AC". */
export function cardId(card: Card): string {
  return `${rankLabel(card.rank)}${card.suit}`;
}

/** Display form of a card, e.g. "5♥", "10♠". */
export function formatCard(card: Card): string {
  return `${rankLabel(card.rank)}${suitSymbol(card.suit)}`;
}

/** Cribbage point value of a card: A=1, 2-10 face value, J/Q/K=10. */
export function cardValue(card: Card): number {
  return card.rank >= 10 ? 10 : card.rank;
}

/** Two cards refer to the same physical card (same rank and suit). */
export function sameCard(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit;
}

const RANK_LOOKUP: Record<string, Rank> = {
  A: 1,
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
};

const SUIT_LOOKUP: Record<string, Suit> = {
  S: 'S',
  H: 'H',
  D: 'D',
  C: 'C',
};

/**
 * Parses a card string such as "5h", "10S", "QD", "AC" into a Card.
 * Returns undefined if the string cannot be parsed as a valid card.
 */
export function parseCard(input: string): Card | undefined {
  const trimmed = input.trim().toUpperCase();
  if (trimmed.length < 2 || trimmed.length > 3) {
    return undefined;
  }
  const suitChar = trimmed.slice(-1);
  const rankPart = trimmed.slice(0, -1);
  const suit = SUIT_LOOKUP[suitChar];
  const rank = RANK_LOOKUP[rankPart];
  if (suit === undefined || rank === undefined) {
    return undefined;
  }
  return { rank, suit };
}

/** All 52 cards in a stable order: suits S,H,D,C then ranks A..K. */
export function fullDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUIT_ORDER) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ rank: rank as Rank, suit });
    }
  }
  return deck;
}

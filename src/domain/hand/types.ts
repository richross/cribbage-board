import type { Card, Rank, Suit } from '../cards';

/** The five scoring categories, always reported in this order. */
export type ComboCategory = 'fifteen' | 'pair' | 'run' | 'flush' | 'nobs';

/** A single scoring combination found within a hand. */
export interface Combo {
  id: string;
  category: ComboCategory;
  cards: Card[];
  points: number;
  label: string;
}

/** The combos and subtotal for one scoring category. */
export interface CategoryTotal {
  category: ComboCategory;
  title: string;
  combos: Combo[];
  subtotal: number;
}

/** The full result of scoring a cribbage hand. */
export interface HandScore {
  total: number;
  categories: CategoryTotal[];
  combos: Combo[];
}

/** Input to scoreHand / validateHand: 4 hand cards plus the cut starter card. */
export interface HandInput {
  hand: Card[];
  starter: Card;
  isCrib: boolean;
}

/** Error codes for invalid hand input. */
export type HandInputErrorCode = 'HAND_SIZE' | 'DUPLICATE' | 'INVALID_CARD';

/** Thrown by scoreHand when the input hand is invalid. */
export class HandInputError extends Error {
  readonly code: HandInputErrorCode;

  constructor(code: HandInputErrorCode, message: string) {
    super(message);
    this.name = 'HandInputError';
    this.code = code;
  }
}

/** Result of validating a hand without throwing. */
export type ValidateHandResult =
  | { valid: true }
  | { valid: false; code: HandInputErrorCode; message: string };

/** Ranks 1-13 are valid; anything else is not. */
export function isValidRank(rank: number): rank is Rank {
  return Number.isInteger(rank) && rank >= 1 && rank <= 13;
}

/** Suits S, H, D, C are valid; anything else is not. */
export function isValidSuit(suit: string): suit is Suit {
  return suit === 'S' || suit === 'H' || suit === 'D' || suit === 'C';
}

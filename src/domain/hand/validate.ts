import type { Card } from '../cards';
import { cardId } from '../cards';
import type { HandInput, ValidateHandResult } from './types';
import { HandInputError, isValidRank, isValidSuit } from './types';

function isValidCard(card: Card): boolean {
  return isValidRank(card.rank) && isValidSuit(card.suit);
}

/**
 * Validates a HandInput without throwing. Checks hand size (4 cards + 1
 * starter), that every card has a valid rank/suit, and that all 5 cards
 * are unique.
 */
export function validateHand(input: HandInput): ValidateHandResult {
  const { hand, starter } = input;

  if (!Array.isArray(hand) || hand.length !== 4) {
    return {
      valid: false,
      code: 'HAND_SIZE',
      message: `Expected exactly 4 hand cards, got ${Array.isArray(hand) ? hand.length : 0}.`,
    };
  }

  const allCards = [...hand, starter];

  for (const card of allCards) {
    if (!card || !isValidCard(card)) {
      return {
        valid: false,
        code: 'INVALID_CARD',
        message: `Invalid card: ${JSON.stringify(card)}.`,
      };
    }
  }

  const seen = new Set<string>();
  for (const card of allCards) {
    const id = cardId(card);
    if (seen.has(id)) {
      return {
        valid: false,
        code: 'DUPLICATE',
        message: `Duplicate card: ${id}.`,
      };
    }
    seen.add(id);
  }

  return { valid: true };
}

/** Throws HandInputError if the hand is invalid; otherwise returns void. */
export function assertValidHand(input: HandInput): void {
  const result = validateHand(input);
  if (!result.valid) {
    throw new HandInputError(result.code, result.message);
  }
}

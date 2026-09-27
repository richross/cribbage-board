import type { Card } from '../../domain/cards';
import { formatCard, parseCard, sameCard } from '../../domain/cards';

export type ParseHandTextResult =
  | { ok: true; hand: Card[]; starter: Card }
  | { ok: false; error: string };

/**
 * Parses a power-user entry like "5h 5c 5d jh 5s" (4 hand cards, then the
 * starter) into cards. Returns a descriptive error instead of throwing.
 */
export function parseHandText(text: string): ParseHandTextResult {
  const tokens = text.trim().split(/\s+/).filter(Boolean);

  if (tokens.length !== 5) {
    return {
      ok: false,
      error: `Enter exactly 5 cards (4 hand + starter) — got ${tokens.length}.`,
    };
  }

  const cards: Card[] = [];
  for (const token of tokens) {
    const card = parseCard(token);
    if (!card) {
      return { ok: false, error: `Couldn't read "${token}" as a card.` };
    }
    cards.push(card);
  }

  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      if (sameCard(cards[i], cards[j])) {
        return { ok: false, error: `Duplicate card: ${formatCard(cards[i])}.` };
      }
    }
  }

  return { ok: true, hand: cards.slice(0, 4), starter: cards[4] };
}

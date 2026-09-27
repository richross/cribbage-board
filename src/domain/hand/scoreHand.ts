import type { Card, Suit } from '../cards';
import { SUIT_ORDER, cardValue, formatCard, suitSymbol } from '../cards';
import type { CategoryTotal, Combo, ComboCategory, HandInput, HandScore } from './types';
import { assertValidHand } from './validate';

const CATEGORY_TITLES: Record<ComboCategory, string> = {
  fifteen: 'Fifteens',
  pair: 'Pairs',
  run: 'Runs',
  flush: 'Flush',
  nobs: 'Nobs',
};

const CATEGORY_ORDER: ComboCategory[] = ['fifteen', 'pair', 'run', 'flush', 'nobs'];

function suitIndex(suit: Suit): number {
  return SUIT_ORDER.indexOf(suit);
}

function compareCards(a: Card, b: Card): number {
  if (a.rank !== b.rank) {
    return a.rank - b.rank;
  }
  return suitIndex(a.suit) - suitIndex(b.suit);
}

function sortCards(cards: Card[]): Card[] {
  return [...cards].sort(compareCards);
}

/** Generates all k-sized combinations of `items`, preserving input order. */
function combinations<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  const current: T[] = [];

  function backtrack(start: number): void {
    if (current.length === size) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < items.length; i++) {
      current.push(items[i]);
      backtrack(i + 1);
      current.pop();
    }
  }

  backtrack(0);
  return result;
}

/** Cartesian product of an array of arrays, preserving input order. */
function cartesianProduct<T>(groups: T[][]): T[][] {
  return groups.reduce<T[][]>(
    (acc, group) => {
      const next: T[][] = [];
      for (const combo of acc) {
        for (const item of group) {
          next.push([...combo, item]);
        }
      }
      return next;
    },
    [[]],
  );
}

function comboId(category: ComboCategory, cards: Card[]): string {
  return `${category}:${sortCards(cards).map((c) => `${c.rank}${c.suit}`).join(',')}`;
}

function findFifteens(cards: Card[]): Combo[] {
  const combos: Combo[] = [];
  for (let size = 2; size <= cards.length; size++) {
    for (const combo of combinations(cards, size)) {
      const sum = combo.reduce((total, card) => total + cardValue(card), 0);
      if (sum === 15) {
        const ordered = sortCards(combo);
        combos.push({
          id: comboId('fifteen', ordered),
          category: 'fifteen',
          cards: ordered,
          points: 2,
          label: `${ordered.map(formatCard).join(' + ')} = 15`,
        });
      }
    }
  }
  return combos;
}

function findPairs(cards: Card[]): Combo[] {
  const combos: Combo[] = [];
  for (const combo of combinations(cards, 2)) {
    if (combo[0].rank === combo[1].rank) {
      const ordered = sortCards(combo);
      combos.push({
        id: comboId('pair', ordered),
        category: 'pair',
        cards: ordered,
        points: 2,
        label: `${ordered.map(formatCard).join(' ')} pair`,
      });
    }
  }
  return combos;
}

function findRuns(cards: Card[]): Combo[] {
  const rankToCards = new Map<number, Card[]>();
  for (const card of cards) {
    const list = rankToCards.get(card.rank) ?? [];
    list.push(card);
    rankToCards.set(card.rank, list);
  }
  const distinctRanks = [...rankToCards.keys()].sort((a, b) => a - b);

  // Group distinct ranks into maximal consecutive segments (no wraparound).
  const segments: number[][] = [];
  let current: number[] = [];
  for (const rank of distinctRanks) {
    if (current.length > 0 && rank === current[current.length - 1] + 1) {
      current.push(rank);
    } else {
      if (current.length > 0) {
        segments.push(current);
      }
      current = [rank];
    }
  }
  if (current.length > 0) {
    segments.push(current);
  }

  const qualifying = segments.filter((segment) => segment.length >= 3);
  if (qualifying.length === 0) {
    return [];
  }
  const maxLength = Math.max(...qualifying.map((segment) => segment.length));
  const runSegments = qualifying.filter((segment) => segment.length === maxLength);

  const combos: Combo[] = [];
  for (const segment of runSegments) {
    const groups = segment.map((rank) => rankToCards.get(rank)!);
    for (const combo of cartesianProduct(groups)) {
      const ordered = sortCards(combo);
      combos.push({
        id: comboId('run', ordered),
        category: 'run',
        cards: ordered,
        points: maxLength,
        label: `${ordered.map(formatCard).join(' ')} run of ${maxLength}`,
      });
    }
  }
  return combos;
}

function findFlush(hand: Card[], starter: Card, isCrib: boolean): Combo[] {
  const handSuits = new Set(hand.map((card) => card.suit));
  if (handSuits.size !== 1) {
    return [];
  }
  const suit = hand[0].suit;
  const starterMatches = starter.suit === suit;

  if (isCrib) {
    if (!starterMatches) {
      return [];
    }
    const cards = sortCards([...hand, starter]);
    return [
      {
        id: comboId('flush', cards),
        category: 'flush',
        cards,
        points: 5,
        label: `Flush ${suitSymbol(suit)} (5 cards)`,
      },
    ];
  }

  if (starterMatches) {
    const cards = sortCards([...hand, starter]);
    return [
      {
        id: comboId('flush', cards),
        category: 'flush',
        cards,
        points: 5,
        label: `Flush ${suitSymbol(suit)} (5 cards)`,
      },
    ];
  }

  const cards = sortCards(hand);
  return [
    {
      id: comboId('flush', cards),
      category: 'flush',
      cards,
      points: 4,
      label: `Flush ${suitSymbol(suit)} (4 cards)`,
    },
  ];
}

function findNobs(hand: Card[], starter: Card): Combo[] {
  const jack = hand.find((card) => card.rank === 11 && card.suit === starter.suit);
  if (!jack) {
    return [];
  }
  return [
    {
      id: comboId('nobs', [jack]),
      category: 'nobs',
      cards: [jack],
      points: 1,
      label: `Nobs ${formatCard(jack)} matches starter ${suitSymbol(starter.suit)}`,
    },
  ];
}

/**
 * Scores a cribbage hand (4 hand cards + 1 starter/cut card) per standard
 * cribbage rules. Does not score "his heels" (starter jack). Throws
 * HandInputError if the input is invalid; use validateHand to check first.
 */
export function scoreHand(input: HandInput): HandScore {
  assertValidHand(input);
  const { hand, starter, isCrib } = input;
  const allCards = [...hand, starter];

  const combosByCategory: Record<ComboCategory, Combo[]> = {
    fifteen: findFifteens(allCards),
    pair: findPairs(allCards),
    run: findRuns(allCards),
    flush: findFlush(hand, starter, isCrib),
    nobs: findNobs(hand, starter),
  };

  const categories: CategoryTotal[] = CATEGORY_ORDER.map((category) => {
    const combos = combosByCategory[category];
    const subtotal = combos.reduce((sum, combo) => sum + combo.points, 0);
    return {
      category,
      title: CATEGORY_TITLES[category],
      combos,
      subtotal,
    };
  });

  const combos = categories.flatMap((c) => c.combos);
  const total = categories.reduce((sum, c) => sum + c.subtotal, 0);

  return { total, categories, combos };
}

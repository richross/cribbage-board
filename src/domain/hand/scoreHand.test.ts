import { describe, expect, it } from 'vitest';
import { cardValue, fullDeck, type Card, type Rank, type Suit } from '../cards';
import { HandInputError, scoreHand, validateHand, type HandInput } from './index';

function c(rank: Rank, suit: Suit): Card {
  return { rank, suit };
}

function subtotal(score: ReturnType<typeof scoreHand>, category: string): number {
  return score.categories.find((cat) => cat.category === category)?.subtotal ?? 0;
}

describe('scoreHand — validation', () => {
  it('throws HAND_SIZE for wrong number of hand cards', () => {
    const input: HandInput = {
      hand: [c(1, 'S'), c(2, 'S'), c(3, 'S')],
      starter: c(4, 'S'),
      isCrib: false,
    };
    expect(() => scoreHand(input)).toThrow(HandInputError);
    try {
      scoreHand(input);
    } catch (err) {
      expect(err).toBeInstanceOf(HandInputError);
      expect((err as HandInputError).code).toBe('HAND_SIZE');
    }
    expect(validateHand(input)).toEqual(
      expect.objectContaining({ valid: false, code: 'HAND_SIZE' }),
    );
  });

  it('throws DUPLICATE for repeated cards', () => {
    const input: HandInput = {
      hand: [c(5, 'H'), c(5, 'H'), c(2, 'S'), c(3, 'S')],
      starter: c(4, 'S'),
      isCrib: false,
    };
    expect(() => scoreHand(input)).toThrow(HandInputError);
    const result = validateHand(input);
    expect(result).toEqual(expect.objectContaining({ valid: false, code: 'DUPLICATE' }));
  });

  it('throws INVALID_CARD for out-of-range rank', () => {
    const input: HandInput = {
      hand: [c(14 as Rank, 'H'), c(5, 'S'), c(2, 'S'), c(3, 'S')],
      starter: c(4, 'S'),
      isCrib: false,
    };
    expect(() => scoreHand(input)).toThrow(HandInputError);
    const result = validateHand(input);
    expect(result).toEqual(expect.objectContaining({ valid: false, code: 'INVALID_CARD' }));
  });

  it('validateHand returns valid:true for a good hand', () => {
    const input: HandInput = {
      hand: [c(5, 'H'), c(6, 'S'), c(2, 'S'), c(3, 'S')],
      starter: c(4, 'S'),
      isCrib: false,
    };
    expect(validateHand(input)).toEqual({ valid: true });
  });
});

describe('scoreHand — canonical hands', () => {
  it('29 hand: 5S5C5D JH + starter 5H', () => {
    const score = scoreHand({
      hand: [c(5, 'S'), c(5, 'C'), c(5, 'D'), c(11, 'H')],
      starter: c(5, 'H'),
      isCrib: false,
    });
    expect(subtotal(score, 'fifteen')).toBe(16);
    expect(subtotal(score, 'pair')).toBe(12);
    expect(subtotal(score, 'run')).toBe(0);
    expect(subtotal(score, 'flush')).toBe(0);
    expect(subtotal(score, 'nobs')).toBe(1);
    expect(score.total).toBe(29);
  });

  it('28 hand: 5S5C5D5H + starter JS (nobs does not apply to starter jack)', () => {
    const score = scoreHand({
      hand: [c(5, 'S'), c(5, 'C'), c(5, 'D'), c(5, 'H')],
      starter: c(11, 'S'),
      isCrib: false,
    });
    expect(subtotal(score, 'fifteen')).toBe(16);
    expect(subtotal(score, 'pair')).toBe(12);
    expect(subtotal(score, 'run')).toBe(0);
    expect(subtotal(score, 'flush')).toBe(0);
    expect(subtotal(score, 'nobs')).toBe(0);
    expect(score.total).toBe(28);
  });

  it('4,4,5,5,6 double-double run: runs 12, pairs 4, fifteens 8 = 24', () => {
    const score = scoreHand({
      hand: [c(4, 'S'), c(4, 'H'), c(5, 'D'), c(5, 'C')],
      starter: c(6, 'S'),
      isCrib: false,
    });
    expect(subtotal(score, 'run')).toBe(12);
    expect(subtotal(score, 'pair')).toBe(4);
    expect(subtotal(score, 'fifteen')).toBe(8);
    expect(subtotal(score, 'flush')).toBe(0);
    expect(subtotal(score, 'nobs')).toBe(0);
    expect(score.total).toBe(24);
    // 4 distinct run combos of length 3 (2 fours x 2 fives x 1 six).
    const runCombos = score.categories.find((cat) => cat.category === 'run')!.combos;
    expect(runCombos).toHaveLength(4);
    expect(runCombos.every((combo) => combo.points === 3)).toBe(true);
  });

  it('3,3,4,4,5 double-double run: runs 12, pairs 4, fifteens computed', () => {
    const score = scoreHand({
      hand: [c(3, 'S'), c(3, 'H'), c(4, 'D'), c(4, 'C')],
      starter: c(5, 'S'),
      isCrib: false,
    });
    expect(subtotal(score, 'run')).toBe(12);
    expect(subtotal(score, 'pair')).toBe(4);
    // values 3,3,4,4,5: fifteens are only size>=4 subsets summing to 15.
    // 3+3+4+5=15 (2 combos, choosing which 4), 3+4+4+... = 3+4+4+5=16 no.
    // So fifteens = 2 combos * 2pts = 4.
    expect(subtotal(score, 'fifteen')).toBe(4);
    expect(score.total).toBe(20);
  });

  it('triple run 3,4,4,4,5: runs 9, pairs 6, fifteens computed', () => {
    const score = scoreHand({
      hand: [c(3, 'S'), c(4, 'H'), c(4, 'D'), c(4, 'C')],
      starter: c(5, 'S'),
      isCrib: false,
    });
    expect(subtotal(score, 'run')).toBe(9);
    expect(subtotal(score, 'pair')).toBe(6);
    // values 3,4,4,4,5: only 3+4+4+4=15 (1 combo) sums to 15.
    expect(subtotal(score, 'fifteen')).toBe(2);
    expect(score.total).toBe(17);
  });

  it('double run of 4: 3,4,5,5,6', () => {
    const score = scoreHand({
      hand: [c(3, 'S'), c(4, 'H'), c(5, 'D'), c(5, 'C')],
      starter: c(6, 'S'),
      isCrib: false,
    });
    expect(subtotal(score, 'run')).toBe(8); // 2 combos of length 4
    expect(subtotal(score, 'pair')).toBe(2);
    const runCombos = score.categories.find((cat) => cat.category === 'run')!.combos;
    expect(runCombos).toHaveLength(2);
    expect(runCombos.every((combo) => combo.points === 4)).toBe(true);
  });

  it('run of 5: A,2,3,4,5', () => {
    const score = scoreHand({
      hand: [c(1, 'S'), c(2, 'H'), c(3, 'D'), c(4, 'C')],
      starter: c(5, 'S'),
      isCrib: false,
    });
    expect(subtotal(score, 'run')).toBe(5);
    // A+4=5,2+3=5 no... check fifteens: values 1,2,3,4,5 sum combos ==15 only all five (1+2+3+4+5=15).
    expect(subtotal(score, 'fifteen')).toBe(2);
    expect(subtotal(score, 'pair')).toBe(0);
    expect(score.total).toBe(7);
  });

  it('run of 4 does not also score a sub-run of 3: 3,4,5,6', () => {
    const score = scoreHand({
      hand: [c(3, 'S'), c(4, 'H'), c(5, 'D'), c(6, 'C')],
      starter: c(9, 'S'),
      isCrib: false,
    });
    const runCombos = score.categories.find((cat) => cat.category === 'run')!.combos;
    expect(runCombos).toHaveLength(1);
    expect(runCombos[0].points).toBe(4);
    expect(subtotal(score, 'run')).toBe(4);
  });

  it('no wraparound: Q,K,A,2 does not form a run', () => {
    const score = scoreHand({
      hand: [c(12, 'S'), c(13, 'H'), c(1, 'D'), c(2, 'C')],
      starter: c(9, 'S'),
      isCrib: false,
    });
    expect(subtotal(score, 'run')).toBe(0);
  });

  it('zero hand: 10S 6H 4D 2C + starter KS', () => {
    const score = scoreHand({
      hand: [c(10, 'S'), c(6, 'H'), c(4, 'D'), c(2, 'C')],
      starter: c(13, 'S'),
      isCrib: false,
    });
    expect(score.total).toBe(0);
    expect(subtotal(score, 'fifteen')).toBe(0);
    expect(subtotal(score, 'pair')).toBe(0);
    expect(subtotal(score, 'run')).toBe(0);
    expect(subtotal(score, 'flush')).toBe(0);
    expect(subtotal(score, 'nobs')).toBe(0);
  });
});

describe('scoreHand — flush', () => {
  it('hand flush of 4 with off-suit starter scores 4', () => {
    const score = scoreHand({
      hand: [c(2, 'S'), c(5, 'S'), c(9, 'S'), c(11, 'S')],
      starter: c(7, 'H'),
      isCrib: false,
    });
    expect(subtotal(score, 'flush')).toBe(4);
  });

  it('hand flush of 4 with matching starter scores 5', () => {
    const score = scoreHand({
      hand: [c(2, 'S'), c(5, 'S'), c(9, 'S'), c(11, 'S')],
      starter: c(7, 'S'),
      isCrib: false,
    });
    expect(subtotal(score, 'flush')).toBe(5);
  });

  it('crib with 4 suited + off-suit starter scores 0', () => {
    const score = scoreHand({
      hand: [c(2, 'S'), c(5, 'S'), c(9, 'S'), c(11, 'S')],
      starter: c(7, 'H'),
      isCrib: true,
    });
    expect(subtotal(score, 'flush')).toBe(0);
  });

  it('crib with all 5 suited scores 5', () => {
    const score = scoreHand({
      hand: [c(2, 'S'), c(5, 'S'), c(9, 'S'), c(11, 'S')],
      starter: c(7, 'S'),
      isCrib: true,
    });
    expect(subtotal(score, 'flush')).toBe(5);
  });
});

describe('scoreHand — nobs', () => {
  it('jack in hand matching starter suit scores 1', () => {
    const score = scoreHand({
      hand: [c(11, 'H'), c(2, 'S'), c(4, 'D'), c(6, 'C')],
      starter: c(9, 'H'),
      isCrib: false,
    });
    expect(subtotal(score, 'nobs')).toBe(1);
  });

  it('jack as the starter does not score nobs', () => {
    const score = scoreHand({
      hand: [c(2, 'S'), c(4, 'D'), c(6, 'C'), c(8, 'H')],
      starter: c(11, 'H'),
      isCrib: false,
    });
    expect(subtotal(score, 'nobs')).toBe(0);
  });

  it('jack in hand not matching starter suit scores 0', () => {
    const score = scoreHand({
      hand: [c(11, 'H'), c(2, 'S'), c(4, 'D'), c(6, 'C')],
      starter: c(9, 'S'),
      isCrib: false,
    });
    expect(subtotal(score, 'nobs')).toBe(0);
  });
});

describe('scoreHand — face card fifteens', () => {
  it('K+5, Q+5, 10+5, J+5 each score a distinct fifteen', () => {
    for (const faceRank of [10, 11, 12, 13] as Rank[]) {
      const score = scoreHand({
        hand: [c(faceRank, 'H'), c(5, 'S'), c(2, 'D'), c(3, 'C')],
        starter: c(9, 'D'),
        isCrib: false,
      });
      const fifteenCombos = score.categories.find((cat) => cat.category === 'fifteen')!.combos;
      expect(fifteenCombos.some((combo) => combo.cards.length === 2)).toBe(true);
    }
  });
});

describe('scoreHand — categories always present in fixed order', () => {
  it('includes empty categories with subtotal 0', () => {
    const score = scoreHand({
      hand: [c(10, 'S'), c(6, 'H'), c(4, 'D'), c(2, 'C')],
      starter: c(13, 'S'),
      isCrib: false,
    });
    expect(score.categories.map((cat) => cat.category)).toEqual([
      'fifteen',
      'pair',
      'run',
      'flush',
      'nobs',
    ]);
    for (const cat of score.categories) {
      expect(cat.subtotal).toBe(0);
      expect(cat.combos).toEqual([]);
    }
  });
});

// --- Brute-force reference scorer, implemented independently from scoreHand,
// used to cross-check totals across many random deals. ---

function bruteForceTotal(hand: Card[], starter: Card, isCrib: boolean): number {
  const cards = [...hand, starter];
  let total = 0;

  // Fifteens + pairs via bitmask subset enumeration (1..31).
  for (let mask = 1; mask < 32; mask++) {
    const subset: Card[] = [];
    for (let i = 0; i < 5; i++) {
      if (mask & (1 << i)) subset.push(cards[i]);
    }
    const sum = subset.reduce((s, card) => s + cardValue(card), 0);
    if (sum === 15) total += 2;
    if (subset.length === 2 && subset[0].rank === subset[1].rank) total += 2;
  }

  // Runs: check subset sizes 5,4,3 descending; take the largest size with
  // any qualifying (distinct, consecutive-rank) subsets.
  for (const size of [5, 4, 3]) {
    const qualifying: Card[][] = [];
    for (let mask = 1; mask < 32; mask++) {
      const subset: Card[] = [];
      for (let i = 0; i < 5; i++) {
        if (mask & (1 << i)) subset.push(cards[i]);
      }
      if (subset.length !== size) continue;
      const ranks = subset.map((card) => card.rank);
      if (new Set(ranks).size !== ranks.length) continue; // must be distinct ranks
      const sorted = [...ranks].sort((a, b) => a - b);
      let consecutive = true;
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] !== sorted[i - 1] + 1) consecutive = false;
      }
      if (consecutive) qualifying.push(subset);
    }
    if (qualifying.length > 0) {
      total += size * qualifying.length;
      break;
    }
  }

  // Flush.
  const handSuits = new Set(hand.map((card) => card.suit));
  if (handSuits.size === 1) {
    const matches = starter.suit === hand[0].suit;
    if (isCrib) {
      if (matches) total += 5;
    } else {
      total += matches ? 5 : 4;
    }
  }

  // Nobs.
  if (hand.some((card) => card.rank === 11 && card.suit === starter.suit)) {
    total += 1;
  }

  return total;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

describe('scoreHand — brute-force cross validation', () => {
  it('matches an independent reference scorer across 2000 random deals', () => {
    const random = mulberry32(20240517);
    const deck = fullDeck();
    const observedTotals = new Set<number>();

    for (let trial = 0; trial < 2000; trial++) {
      const deal = shuffled(deck, random).slice(0, 5);
      const hand = deal.slice(0, 4);
      const starter = deal[4];
      const isCrib = trial % 2 === 0;

      const expected = bruteForceTotal(hand, starter, isCrib);
      const actual = scoreHand({ hand, starter, isCrib }).total;
      observedTotals.add(actual);

      if (actual !== expected) {
        throw new Error(
          `Mismatch on trial ${trial}: hand=${JSON.stringify(hand)} starter=${JSON.stringify(
            starter,
          )} isCrib=${isCrib} expected=${expected} actual=${actual}`,
        );
      }
    }

    // Famous impossible cribbage hand scores.
    for (const impossible of [19, 25, 26, 27]) {
      expect(observedTotals.has(impossible)).toBe(false);
    }
  });
});

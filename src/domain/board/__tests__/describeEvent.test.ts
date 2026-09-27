import { describe, expect, it } from 'vitest';
import { addScore, newGame, nextDeal, setDealer, undo } from '../game';
import { deriveState, describeEvent, describeUndo } from '../deriveState';

describe('describeEvent', () => {
  it('describes a score event with running total and to-go', () => {
    let game = newGame('two');
    game = addScore(game, 'P1', 4);
    const state = deriveState(game);
    const evt = game.events[0];
    expect(describeEvent(evt, state)).toBe('Player 1 scored 4. Now 4, 117 to go.');
  });

  it('describes a nextDeal event with dealer and hand number', () => {
    let game = newGame('two');
    game = nextDeal(game);
    const state = deriveState(game);
    const evt = game.events[0];
    expect(describeEvent(evt, state)).toBe('Next deal. Dealer is Player 2. Hand 2.');
  });

  it('describes a setDealer event', () => {
    let game = newGame('three');
    game = setDealer(game, 2);
    const state = deriveState(game);
    const evt = game.events[0];
    expect(describeEvent(evt, state)).toBe('Dealer set to Player 3.');
  });

  it('describes a winning score event with skunk text', () => {
    let game = newGame('two');
    game = addScore(game, 'P2', 29);
    game = addScore(game, 'P2', 29); // P2 at 58 (double skunk range)
    // P1 to 121 in chunks of <=29
    let remaining = 121;
    while (remaining > 0) {
      const amt = Math.min(29, remaining);
      game = addScore(game, 'P1', amt);
      remaining -= amt;
    }
    const state = deriveState(game);
    const winEvt = game.events.filter((e) => e.type === 'score' && e.trackId === 'P1').pop()!;
    expect(describeEvent(winEvt, state)).toBe('Player 1 wins 121 to 58. Double skunk!');
  });
});

describe('describeUndo', () => {
  it('describes undoing a score', () => {
    let game = newGame('two');
    game = addScore(game, 'P2', 6);
    const removed = game.events[game.events.length - 1];
    game = undo(game);
    const state = deriveState(game);
    expect(describeUndo(removed, state)).toBe('Undid: Player 2 +6.');
  });

  it('describes undoing a next deal', () => {
    let game = newGame('two');
    game = nextDeal(game);
    const removed = game.events[game.events.length - 1];
    game = undo(game);
    const state = deriveState(game);
    expect(describeUndo(removed, state)).toBe('Undid: Next deal.');
  });

  it('describes undoing a setDealer', () => {
    let game = newGame('two');
    game = setDealer(game, 1);
    const removed = game.events[game.events.length - 1];
    game = undo(game);
    const state = deriveState(game);
    expect(describeUndo(removed, state)).toBe('Undid: Dealer set to Player 2.');
  });
});

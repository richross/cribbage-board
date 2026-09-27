// Pure, reducer-style API for mutating a Game's event ledger.

import { deriveState } from './deriveState';
import { generateId } from './id';
import { isValidSeatIndex, isValidTrackId } from './tracks';
import type { Game, GameEvent, GameFormat, TrackId } from './types';

/** Thrown when an action would score/deal after the game has already been won. */
export class GameOverError extends Error {
  readonly winner: TrackId;

  constructor(winner: TrackId) {
    super(`Game is already won by ${winner}; no further actions are allowed.`);
    this.name = 'GameOverError';
    this.winner = winner;
  }
}

function assertValidAmount(amount: number): void {
  if (!Number.isInteger(amount) || amount < 1 || amount > 29) {
    throw new RangeError(`Score amount must be an integer between 1 and 29, got ${amount}.`);
  }
}

function assertValidTrackId(format: GameFormat, trackId: string): asserts trackId is TrackId {
  if (!isValidTrackId(format, trackId)) {
    throw new RangeError(`Track "${trackId}" is not valid for format "${format}".`);
  }
}

function assertValidSeatIndex(format: GameFormat, seatIndex: number): void {
  if (!isValidSeatIndex(format, seatIndex)) {
    throw new RangeError(`Seat index ${seatIndex} is not valid for format "${format}".`);
  }
}

function assertNotOver(game: Game): void {
  const state = deriveState(game);
  if (state.winner) {
    throw new GameOverError(state.winner);
  }
}

function withEvent(game: Game, event: GameEvent): Game {
  return { ...game, events: [...game.events, event] };
}

/** Creates a fresh, empty game for the given format. */
export function newGame(format: GameFormat, now: number = Date.now()): Game {
  return {
    id: generateId('game'),
    format,
    createdAt: now,
    events: [],
  };
}

export function addScore(game: Game, trackId: TrackId, amount: number, now: number = Date.now()): Game {
  assertValidTrackId(game.format, trackId);
  assertValidAmount(amount);
  assertNotOver(game);
  return withEvent(game, { id: generateId('evt'), type: 'score', trackId, amount, at: now });
}

export function nextDeal(game: Game, now: number = Date.now()): Game {
  assertNotOver(game);
  return withEvent(game, { id: generateId('evt'), type: 'nextDeal', at: now });
}

export function setDealer(game: Game, seatIndex: number, now: number = Date.now()): Game {
  assertValidSeatIndex(game.format, seatIndex);
  assertNotOver(game);
  return withEvent(game, { id: generateId('evt'), type: 'setDealer', seatIndex, at: now });
}

/** Removes the last event of any type. No-op if the ledger is empty. */
export function undo(game: Game): Game {
  if (game.events.length === 0) {
    return game;
  }
  return { ...game, events: game.events.slice(0, -1) };
}

export function canUndo(game: Game): boolean {
  return game.events.length > 0;
}

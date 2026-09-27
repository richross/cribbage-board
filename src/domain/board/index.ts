// Public API for the cribbage scoreboard domain model.

export type {
  Game,
  GameEvent,
  GameFormat,
  GameResult,
  GameState,
  HistoryEntry,
  NextDealEvent,
  Seat,
  ScoreEvent,
  SetDealerEvent,
  Skunk,
  Track,
  TrackColor,
  TrackId,
  TrackShape,
  TrackState,
} from './types';

export { getSeats, getTrackIds, getTracks, isValidSeatIndex, isValidTrackId } from './tracks';

export { addScore, canUndo, GameOverError, newGame, nextDeal, setDealer, undo } from './game';

export { deriveState, describeEvent, describeUndo } from './deriveState';

export {
  createGameStore,
  deserialize,
  SCHEMA_VERSION,
  serialize,
  STORAGE_KEY,
} from './persistence';
export type { DeserializeFailureReason, DeserializeResult, GameEnvelope, GameStore, StorageLike } from './persistence';

// LocalStorage-backed persistence for a Game, with hand-written runtime validation
// (no external schema library) and a version migration pipeline.

import { isValidSeatIndex, isValidTrackId } from './tracks';
import type { Game, GameEvent, GameFormat } from './types';

export const STORAGE_KEY = 'cribbage-companion:game';
export const SCHEMA_VERSION = 1;

export interface GameEnvelope {
  version: number;
  game: Game;
}

export type DeserializeResult = { ok: true; game: Game } | { ok: false; reason: DeserializeFailureReason };

export type DeserializeFailureReason = 'empty' | 'corrupt' | 'unsupported-version';

const VALID_FORMATS: GameFormat[] = ['two', 'three', 'teams'];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidFormat(value: unknown): value is GameFormat {
  return typeof value === 'string' && (VALID_FORMATS as string[]).includes(value);
}

function isValidEvent(value: unknown, format: GameFormat): value is GameEvent {
  if (!isPlainObject(value)) return false;
  const { id, type, at } = value;
  if (typeof id !== 'string' || id.length === 0) return false;
  if (!isFiniteNumber(at)) return false;

  if (type === 'score') {
    const { trackId, amount } = value;
    if (typeof trackId !== 'string' || !isValidTrackId(format, trackId)) return false;
    if (!Number.isInteger(amount) || (amount as number) < 1 || (amount as number) > 29) return false;
    return true;
  }
  if (type === 'nextDeal') {
    return true;
  }
  if (type === 'setDealer') {
    const { seatIndex } = value;
    if (typeof seatIndex !== 'number' || !isValidSeatIndex(format, seatIndex)) return false;
    return true;
  }
  return false;
}

function isValidGame(value: unknown): value is Game {
  if (!isPlainObject(value)) return false;
  const { id, format, createdAt, events } = value;
  if (typeof id !== 'string' || id.length === 0) return false;
  if (!isValidFormat(format)) return false;
  if (!isFiniteNumber(createdAt)) return false;
  if (!Array.isArray(events)) return false;
  return events.every((event) => isValidEvent(event, format));
}

/** Validates and normalizes a raw envelope-shaped value at the current schema version. */
function validateV1(value: unknown): Game | null {
  if (!isPlainObject(value)) return null;
  const { version, game } = value;
  if (version !== 1) return null;
  if (!isValidGame(game)) return null;
  return game;
}

/**
 * Migration pipeline: takes an arbitrary parsed JSON value and produces a current-version
 * `Game`, or `null` if the shape is invalid/unsupported. Version 1 is identity; any future
 * version bump should add a case here that upgrades older envelopes forward.
 */
function migrate(value: unknown): { game: Game } | { unsupportedVersion: true } | null {
  if (!isPlainObject(value)) return null;
  const { version } = value;
  if (version === 1) {
    const game = validateV1(value);
    return game ? { game } : null;
  }
  if (typeof version === 'number') {
    return { unsupportedVersion: true };
  }
  return null;
}

export function serialize(game: Game): string {
  const envelope: GameEnvelope = { version: SCHEMA_VERSION, game };
  return JSON.stringify(envelope);
}

export function deserialize(raw: string | null): DeserializeResult {
  if (raw === null || raw === '') {
    return { ok: false, reason: 'empty' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'corrupt' };
  }

  const migrated = migrate(parsed);
  if (migrated === null) {
    return { ok: false, reason: 'corrupt' };
  }
  if ('unsupportedVersion' in migrated) {
    return { ok: false, reason: 'unsupported-version' };
  }
  return { ok: true, game: migrated.game };
}

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface GameStore {
  load(): DeserializeResult;
  save(game: Game): boolean;
  clear(): boolean;
}

/**
 * Creates a storage-backed game store. All storage exceptions (quota exceeded, storage
 * disabled, etc.) are caught and surfaced as safe fallback results rather than thrown.
 */
export function createGameStore(
  storage: StorageLike = typeof localStorage !== 'undefined' ? localStorage : (undefined as never),
): GameStore {
  return {
    load(): DeserializeResult {
      try {
        const raw = storage.getItem(STORAGE_KEY);
        return deserialize(raw);
      } catch {
        return { ok: false, reason: 'corrupt' };
      }
    },
    save(game: Game): boolean {
      try {
        storage.setItem(STORAGE_KEY, serialize(game));
        return true;
      } catch {
        return false;
      }
    },
    clear(): boolean {
      try {
        storage.removeItem(STORAGE_KEY);
        return true;
      } catch {
        return false;
      }
    },
  };
}

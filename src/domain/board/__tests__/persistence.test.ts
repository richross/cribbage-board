import { describe, expect, it, vi } from 'vitest';
import { addScore, newGame, nextDeal } from '../game';
import {
  createGameStore,
  deserialize,
  SCHEMA_VERSION,
  serialize,
  STORAGE_KEY,
  type StorageLike,
} from '../persistence';

function makeMemoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => (data.has(key) ? data.get(key)! : null),
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}

describe('serialize/deserialize roundtrip', () => {
  it('roundtrips a game unchanged', () => {
    let game = newGame('teams', 500);
    game = addScore(game, 'T1', 8);
    game = nextDeal(game);
    const raw = serialize(game);
    const result = deserialize(raw);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.game).toEqual(game);
    }
  });

  it('embeds the current schema version', () => {
    const game = newGame('two');
    const raw = serialize(game);
    const parsed = JSON.parse(raw);
    expect(parsed.version).toBe(SCHEMA_VERSION);
  });
});

describe('deserialize error handling', () => {
  it('reports empty for null or empty string', () => {
    expect(deserialize(null)).toEqual({ ok: false, reason: 'empty' });
    expect(deserialize('')).toEqual({ ok: false, reason: 'empty' });
  });

  it('reports corrupt for invalid JSON', () => {
    expect(deserialize('{not json')).toEqual({ ok: false, reason: 'corrupt' });
  });

  it('reports corrupt for wrong shapes', () => {
    expect(deserialize(JSON.stringify({ version: 1, game: null }))).toEqual({
      ok: false,
      reason: 'corrupt',
    });
    expect(deserialize(JSON.stringify({ version: 1, game: { id: 'x' } }))).toEqual({
      ok: false,
      reason: 'corrupt',
    });
    expect(
      deserialize(
        JSON.stringify({
          version: 1,
          game: { id: 'x', format: 'two', createdAt: 1, events: [{ type: 'bogus' }] },
        }),
      ),
    ).toEqual({ ok: false, reason: 'corrupt' });
  });

  it('reports corrupt for an invalid trackId for the format', () => {
    const bad = {
      version: 1,
      game: {
        id: 'x',
        format: 'two',
        createdAt: 1,
        events: [{ id: 'e1', type: 'score', trackId: 'P3', amount: 5, at: 1 }],
      },
    };
    expect(deserialize(JSON.stringify(bad))).toEqual({ ok: false, reason: 'corrupt' });
  });

  it('reports corrupt for an out-of-range seatIndex', () => {
    const bad = {
      version: 1,
      game: {
        id: 'x',
        format: 'two',
        createdAt: 1,
        events: [{ id: 'e1', type: 'setDealer', seatIndex: 5, at: 1 }],
      },
    };
    expect(deserialize(JSON.stringify(bad))).toEqual({ ok: false, reason: 'corrupt' });
  });

  it('reports corrupt for an out-of-range score amount', () => {
    const bad = {
      version: 1,
      game: {
        id: 'x',
        format: 'two',
        createdAt: 1,
        events: [{ id: 'e1', type: 'score', trackId: 'P1', amount: 30, at: 1 }],
      },
    };
    expect(deserialize(JSON.stringify(bad))).toEqual({ ok: false, reason: 'corrupt' });
  });

  it('reports unsupported-version for a future version number', () => {
    const future = { version: 999, game: newGame('two') };
    expect(deserialize(JSON.stringify(future))).toEqual({
      ok: false,
      reason: 'unsupported-version',
    });
  });
});

describe('createGameStore', () => {
  it('saves and loads a game', () => {
    const storage = makeMemoryStorage();
    const store = createGameStore(storage);
    const game = newGame('two', 42);
    expect(store.save(game)).toBe(true);
    expect(storage.data.has(STORAGE_KEY)).toBe(true);
    const loaded = store.load();
    expect(loaded).toEqual({ ok: true, game });
  });

  it('clears a stored game', () => {
    const storage = makeMemoryStorage();
    const store = createGameStore(storage);
    store.save(newGame('two'));
    expect(store.clear()).toBe(true);
    expect(store.load()).toEqual({ ok: false, reason: 'empty' });
  });

  it('never throws when setItem fails (e.g. quota exceeded)', () => {
    const storage = makeMemoryStorage();
    storage.setItem = vi.fn(() => {
      throw new Error('QuotaExceededError');
    });
    const store = createGameStore(storage);
    expect(() => store.save(newGame('two'))).not.toThrow();
    expect(store.save(newGame('two'))).toBe(false);
  });

  it('never throws when getItem fails (e.g. storage disabled)', () => {
    const storage = makeMemoryStorage();
    storage.getItem = vi.fn(() => {
      throw new Error('SecurityError');
    });
    const store = createGameStore(storage);
    expect(() => store.load()).not.toThrow();
    expect(store.load()).toEqual({ ok: false, reason: 'corrupt' });
  });

  it('never throws when removeItem fails', () => {
    const storage = makeMemoryStorage();
    storage.removeItem = vi.fn(() => {
      throw new Error('fail');
    });
    const store = createGameStore(storage);
    expect(() => store.clear()).not.toThrow();
    expect(store.clear()).toBe(false);
  });
});

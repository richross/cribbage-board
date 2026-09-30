import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Card } from '../../domain/cards';
import { loadHandState, saveHandState } from './handStorage';
import { SLOT_COUNT } from './state';

const STORAGE_KEY = 'cribbage-companion:hand-scorer';

const fiveOfHearts: Card = { rank: 5, suit: 'H' };

function write(value: unknown) {
  sessionStorage.setItem(STORAGE_KEY, typeof value === 'string' ? value : JSON.stringify(value));
}

describe('handStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadHandState', () => {
    it('returns undefined when nothing has been stored', () => {
      expect(loadHandState()).toBeUndefined();
    });

    it('round-trips a saved hand', () => {
      const slots = [fiveOfHearts, null, null, null, null] as never;
      saveHandState({ slots, isCrib: true });
      const loaded = loadHandState();
      expect(loaded?.isCrib).toBe(true);
      expect(loaded?.slots[0]).toEqual(fiveOfHearts);
      expect(loaded?.slots).toHaveLength(SLOT_COUNT);
    });

    it('returns undefined for malformed JSON rather than throwing', () => {
      write('{not json');
      expect(loadHandState()).toBeUndefined();
    });

    it('rejects a payload whose slots are not an array', () => {
      write({ slots: 'nope', isCrib: false });
      expect(loadHandState()).toBeUndefined();
    });

    it('rejects a payload with the wrong number of slots', () => {
      write({ slots: [null, null], isCrib: false });
      expect(loadHandState()).toBeUndefined();
    });

    it('nulls out entries that are not valid cards, keeping the valid ones', () => {
      write({
        slots: [fiveOfHearts, 'JH', { rank: 'five', suit: 'H' }, { rank: 5 }, null],
        isCrib: false,
      });
      const loaded = loadHandState();
      expect(loaded?.slots[0]).toEqual(fiveOfHearts);
      expect(loaded?.slots[1]).toBeNull();
      expect(loaded?.slots[2]).toBeNull();
      expect(loaded?.slots[3]).toBeNull();
      expect(loaded?.slots[4]).toBeNull();
    });

    it('coerces a missing isCrib to false', () => {
      write({ slots: [null, null, null, null, null] });
      expect(loadHandState()?.isCrib).toBe(false);
    });

    it('returns undefined when sessionStorage itself throws', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('denied');
      });
      expect(loadHandState()).toBeUndefined();
    });
  });

  describe('saveHandState', () => {
    it('swallows sessionStorage failures instead of crashing the app', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded');
      });
      expect(() => saveHandState({ slots: [null, null, null, null, null] as never, isCrib: false })).not.toThrow();
    });
  });
});

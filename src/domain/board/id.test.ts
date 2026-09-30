import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateId } from './id';

describe('generateId', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses crypto.randomUUID when it is available', () => {
    const randomUUID = vi.fn(() => '11111111-2222-3333-4444-555555555555');
    vi.stubGlobal('crypto', { randomUUID });

    expect(generateId()).toBe('11111111-2222-3333-4444-555555555555');
    expect(randomUUID).toHaveBeenCalledTimes(1);
  });

  it('falls back to a prefixed counter id when randomUUID is missing', () => {
    vi.stubGlobal('crypto', {});

    const id = generateId('game');
    expect(id).toMatch(/^game-\d+-\d+-[a-z0-9]+$/);
  });

  it('falls back when crypto is undefined entirely', () => {
    vi.stubGlobal('crypto', undefined);

    expect(generateId('peg')).toMatch(/^peg-/);
  });

  it('defaults the prefix to "id"', () => {
    vi.stubGlobal('crypto', {});

    expect(generateId()).toMatch(/^id-/);
  });

  it('never repeats a fallback id', () => {
    vi.stubGlobal('crypto', {});

    const ids = new Set(Array.from({ length: 50 }, () => generateId()));
    expect(ids.size).toBe(50);
  });
});

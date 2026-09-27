import type { Card } from '../../domain/cards';
import type { Slots } from './state';
import { SLOT_COUNT } from './state';

const STORAGE_KEY = 'cribbage-companion:hand-scorer';

export interface StoredHandState {
  slots: Slots;
  isCrib: boolean;
}

function isValidStoredCard(value: unknown): value is Card {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.rank === 'number' && typeof candidate.suit === 'string';
}

/** Reads the persisted hand from sessionStorage (per-tab, cleared on close). */
export function loadHandState(): StoredHandState | undefined {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return undefined;
    }
    const parsed = JSON.parse(raw) as { slots?: unknown; isCrib?: unknown };
    if (!Array.isArray(parsed.slots) || parsed.slots.length !== SLOT_COUNT) {
      return undefined;
    }
    const slots = parsed.slots.map((slot) => (slot === null ? null : isValidStoredCard(slot) ? slot : null));
    return { slots: slots as unknown as Slots, isCrib: Boolean(parsed.isCrib) };
  } catch {
    return undefined;
  }
}

/** Persists the hand so switching tabs (or reloading) keeps it for this session. */
export function saveHandState(state: StoredHandState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage can throw in private/locked-down browsing modes — losing
    // persistence there is an acceptable degradation, not a crash.
  }
}

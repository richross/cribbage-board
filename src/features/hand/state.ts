import type { Card } from '../../domain/cards';
import { sameCard } from '../../domain/cards';

/** Slot 0-3 hold the hand (or crib) cards; slot 4 holds the starter/cut card. */
export const SLOT_COUNT = 5;
export const STARTER_INDEX = 4;

export type Slots = readonly [Card | null, Card | null, Card | null, Card | null, Card | null];

export const EMPTY_SLOTS: Slots = [null, null, null, null, null];

export interface HandState {
  slots: Slots;
  isCrib: boolean;
  activeIndex: number;
}

export type HandAction =
  | { type: 'pick'; card: Card }
  | { type: 'removeSlot'; index: number }
  | { type: 'selectSlot'; index: number }
  | { type: 'setCrib'; isCrib: boolean }
  | { type: 'reset' }
  | { type: 'setCards'; hand: Card[]; starter: Card };

export function isCardUsed(slots: Slots, card: Card): boolean {
  return slots.some((slot) => slot !== null && sameCard(slot, card));
}

/** Index of the first empty slot in fill order (hand 1-4, then starter), or -1 if full. */
export function firstEmptyIndex(slots: Slots): number {
  return slots.findIndex((slot) => slot === null);
}

export function handReducer(state: HandState, action: HandAction): HandState {
  switch (action.type) {
    case 'pick': {
      if (isCardUsed(state.slots, action.card)) {
        return state;
      }
      const slots = [...state.slots] as Card[] | null[];
      (slots as (Card | null)[])[state.activeIndex] = action.card;
      const nextSlots = slots as unknown as Slots;
      const empty = firstEmptyIndex(nextSlots);
      return {
        ...state,
        slots: nextSlots,
        activeIndex: empty === -1 ? state.activeIndex : empty,
      };
    }
    case 'removeSlot': {
      const slots = [...state.slots] as (Card | null)[];
      slots[action.index] = null;
      return { ...state, slots: slots as unknown as Slots, activeIndex: action.index };
    }
    case 'selectSlot':
      return { ...state, activeIndex: action.index };
    case 'setCrib':
      return { ...state, isCrib: action.isCrib };
    case 'reset':
      return { ...state, slots: EMPTY_SLOTS, activeIndex: 0 };
    case 'setCards':
      return {
        ...state,
        slots: [...action.hand, action.starter] as unknown as Slots,
        activeIndex: STARTER_INDEX,
      };
    default:
      return state;
  }
}

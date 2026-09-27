import { useCallback, useEffect, useReducer } from 'react';
import type { Card } from '../../domain/cards';
import { loadHandState, saveHandState } from './handStorage';
import type { HandState } from './state';
import { EMPTY_SLOTS, handReducer, isCardUsed } from './state';

function initState(): HandState {
  const stored = loadHandState();
  const slots = stored?.slots ?? EMPTY_SLOTS;
  const emptyIndex = slots.findIndex((slot) => slot === null);
  return {
    slots,
    isCrib: stored?.isCrib ?? false,
    activeIndex: emptyIndex === -1 ? 4 : emptyIndex,
  };
}

/**
 * Owns the Score Hand slot/toggle state: a reducer for the fill/remove/toggle
 * transitions, plus sessionStorage persistence so switching tabs keeps the
 * in-progress hand.
 */
export function useHandState() {
  const [state, dispatch] = useReducer(handReducer, undefined, initState);

  useEffect(() => {
    saveHandState({ slots: state.slots, isCrib: state.isCrib });
  }, [state.slots, state.isCrib]);

  const pick = useCallback((card: Card) => dispatch({ type: 'pick', card }), []);
  const removeSlot = useCallback((index: number) => dispatch({ type: 'removeSlot', index }), []);
  const selectSlot = useCallback((index: number) => dispatch({ type: 'selectSlot', index }), []);
  const setCrib = useCallback((isCrib: boolean) => dispatch({ type: 'setCrib', isCrib }), []);
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);
  const setCards = useCallback(
    (hand: Card[], starter: Card) => dispatch({ type: 'setCards', hand, starter }),
    [],
  );

  return {
    slots: state.slots,
    isCrib: state.isCrib,
    activeIndex: state.activeIndex,
    isUsed: (card: Card) => isCardUsed(state.slots, card),
    pick,
    removeSlot,
    selectSlot,
    setCrib,
    reset,
    setCards,
  };
}

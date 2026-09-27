// State management for the Board route: wraps the domain's pure event-ledger
// Game behind a small imperative API, persisting after every change and
// announcing every action through the shared live region.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addScore as domainAddScore,
  createGameStore,
  deriveState,
  describeEvent,
  describeUndo,
  GameOverError,
  newGame as domainNewGame,
  nextDeal as domainNextDeal,
  setDealer as domainSetDealer,
  undo as domainUndo,
} from '../../domain/board';
import type { Game, GameFormat, GameState, TrackId } from '../../domain/board';
import { useAnnounce } from '../../components';

export type BoardStatus = 'start' | 'game';

export interface UndoSmudge {
  trackId: TrackId;
  /** The score (hole) the front peg is being erased from. */
  hole: number;
  key: number;
}

export interface UseGameResult {
  status: BoardStatus;
  corruptNotice: boolean;
  dismissCorruptNotice: () => void;
  state: GameState | null;
  canUndo: boolean;
  undoLabel: string;
  start: (format: GameFormat) => void;
  scoreTrack: (trackId: TrackId, amount: number) => void;
  goNextDeal: () => void;
  changeDealer: (seatIndex: number) => void;
  undoLast: () => UndoSmudge | null;
  resetToStart: () => void;
}

function pendingUndoLabel(game: Game | null, state: GameState | null): string {
  if (!game || game.events.length === 0) return 'Undo';
  const last = game.events[game.events.length - 1];
  if (last.type === 'score') {
    const label = state?.tracks.find((t) => t.track.id === last.trackId)?.track.shortLabel ?? last.trackId;
    return `Undo +${last.amount} ${label}`;
  }
  if (last.type === 'nextDeal') return 'Undo next deal';
  return 'Undo dealer change';
}

export function useGame(): UseGameResult {
  const storeRef = useRef(createGameStore());
  const [game, setGame] = useState<Game | null>(null);
  const [status, setStatus] = useState<BoardStatus>('start');
  const [corruptNotice, setCorruptNotice] = useState(false);
  const announce = useAnnounce();
  const nextKeyRef = useRef(0);

  useEffect(() => {
    const result = storeRef.current.load();
    if (result.ok) {
      setGame(result.game);
      setStatus('game');
    } else if (result.reason !== 'empty') {
      setCorruptNotice(true);
    }
  }, []);

  const state = useMemo(() => (game ? deriveState(game) : null), [game]);

  const start = useCallback((format: GameFormat) => {
    const g = domainNewGame(format);
    setGame(g);
    setStatus('game');
    setCorruptNotice(false);
    storeRef.current.save(g);
  }, []);

  const scoreTrack = useCallback(
    (trackId: TrackId, amount: number) => {
      if (!game) return;
      try {
        const next = domainAddScore(game, trackId, amount);
        const nextState = deriveState(next);
        const event = next.events[next.events.length - 1];
        setGame(next);
        storeRef.current.save(next);
        announce(describeEvent(event, nextState));
      } catch (err) {
        if (err instanceof GameOverError) return;
        throw err;
      }
    },
    [game, announce],
  );

  const goNextDeal = useCallback(() => {
    if (!game) return;
    try {
      const next = domainNextDeal(game);
      const nextState = deriveState(next);
      const event = next.events[next.events.length - 1];
      setGame(next);
      storeRef.current.save(next);
      announce(describeEvent(event, nextState));
    } catch (err) {
      if (err instanceof GameOverError) return;
      throw err;
    }
  }, [game, announce]);

  const changeDealer = useCallback(
    (seatIndex: number) => {
      if (!game) return;
      try {
        const next = domainSetDealer(game, seatIndex);
        const nextState = deriveState(next);
        const event = next.events[next.events.length - 1];
        setGame(next);
        storeRef.current.save(next);
        announce(describeEvent(event, nextState));
      } catch (err) {
        if (err instanceof GameOverError) return;
        throw err;
      }
    },
    [game, announce],
  );

  const undoLast = useCallback((): UndoSmudge | null => {
    if (!game || game.events.length === 0) return null;
    const removed = game.events[game.events.length - 1];
    const stateBefore = deriveState(game);
    const next = domainUndo(game);
    const stateAfter = deriveState(next);
    setGame(next);
    storeRef.current.save(next);
    announce(describeUndo(removed, stateAfter));
    if (removed.type === 'score') {
      const trackBefore = stateBefore.tracks.find((t) => t.track.id === removed.trackId);
      if (trackBefore) {
        nextKeyRef.current += 1;
        return { trackId: removed.trackId, hole: trackBefore.score, key: nextKeyRef.current };
      }
    }
    return null;
  }, [game, announce]);

  const resetToStart = useCallback(() => {
    storeRef.current.clear();
    setGame(null);
    setStatus('start');
    setCorruptNotice(false);
  }, []);

  const dismissCorruptNotice = useCallback(() => setCorruptNotice(false), []);

  return {
    status,
    corruptNotice,
    dismissCorruptNotice,
    state,
    canUndo: !!game && game.events.length > 0,
    undoLabel: pendingUndoLabel(game, state),
    start,
    scoreTrack,
    goNextDeal,
    changeDealer,
    undoLast,
    resetToStart,
  };
}

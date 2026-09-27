// Derives immutable display/announcement state from a Game's event ledger.

import { getSeats, getTracks } from './tracks';
import type {
  Game,
  GameEvent,
  GameResult,
  GameState,
  HistoryEntry,
  Skunk,
  Track,
  TrackId,
  TrackState,
} from './types';

const WIN_SCORE = 121;

function skunkFor(score: number): Skunk {
  if (score <= 60) return 'double';
  if (score <= 90) return 'skunk';
  return 'none';
}

export function deriveState(game: Game): GameState {
  const tracks = getTracks(game.format);
  const seats = getSeats(game.format);

  const rawScores = new Map<TrackId, number>(tracks.map((track) => [track.id, 0]));
  const backPegs = new Map<TrackId, number>(tracks.map((track) => [track.id, 0]));
  const histories = new Map<TrackId, HistoryEntry[]>(tracks.map((track) => [track.id, []]));

  let dealerSeatIndex = 0;
  let handCount = 0;
  let handNumber = 1;
  let winner: TrackId | null = null;

  for (const event of game.events) {
    if (event.type === 'score') {
      const before = rawScores.get(event.trackId) ?? 0;
      const after = before + event.amount;
      rawScores.set(event.trackId, after);
      backPegs.set(event.trackId, before);
      histories.get(event.trackId)?.push({
        eventId: event.id,
        amount: event.amount,
        before,
        after,
        at: event.at,
        hand: handNumber,
      });
      if (winner === null && after >= WIN_SCORE) {
        winner = event.trackId;
      }
    } else if (event.type === 'nextDeal') {
      const seatCount = seats.length;
      dealerSeatIndex = seatCount === 0 ? 0 : (dealerSeatIndex + 1) % seatCount;
      handCount += 1;
      handNumber = 1 + handCount;
    } else if (event.type === 'setDealer') {
      dealerSeatIndex = event.seatIndex;
    }
  }

  const trackStates: TrackState[] = tracks.map((track) => {
    const rawScore = rawScores.get(track.id) ?? 0;
    const score = Math.min(rawScore, WIN_SCORE);
    return {
      track,
      score,
      rawScore,
      frontPeg: score,
      backPeg: backPegs.get(track.id) ?? 0,
      toGo: Math.max(0, WIN_SCORE - score),
      history: histories.get(track.id) ?? [],
    };
  });

  const dealerSeat = seats[dealerSeatIndex] ?? seats[0];
  const dealerTrackId = dealerSeat.trackId;

  let result: GameResult | null = null;
  if (winner !== null) {
    const losers = tracks
      .filter((track) => track.id !== winner)
      .map((track) => {
        const score = Math.min(rawScores.get(track.id) ?? 0, WIN_SCORE);
        return { trackId: track.id, score, skunk: skunkFor(score) };
      });
    result = { winner, losers };
  }

  return {
    format: game.format,
    tracks: trackStates,
    seats,
    dealerSeatIndex,
    dealerTrackId,
    cribOwnerTrackId: dealerTrackId,
    handNumber,
    winner,
    result,
    lastEvent: game.events.length > 0 ? game.events[game.events.length - 1] : null,
  };
}

function trackLabel(state: GameState, trackId: TrackId): string {
  const found = state.tracks.find((t) => t.track.id === trackId);
  return found ? found.track.label : trackId;
}

function trackByIdState(state: GameState, trackId: TrackId): TrackState | undefined {
  return state.tracks.find((t) => t.track.id === trackId);
}

function describeDealerSet(event: Extract<GameEvent, { type: 'setDealer' }>, state: GameState): string {
  const seat = state.seats.find((s) => s.seatIndex === event.seatIndex);
  const label = seat ? seat.label : trackLabel(state, state.dealerTrackId);
  return `Dealer set to ${label}.`;
}

/** Produces a human-readable, screen-reader-friendly description of an event given the resulting state. */
export function describeEvent(event: GameEvent, state: GameState): string {
  if (event.type === 'score') {
    const label = trackLabel(state, event.trackId);
    const trackState = trackByIdState(state, event.trackId);
    const score = trackState ? trackState.score : 0;
    const toGo = trackState ? trackState.toGo : 0;
    if (state.result && state.result.winner === event.trackId) {
      const loser = state.result.losers[0];
      const skunkText =
        loser?.skunk === 'double' ? ' Double skunk!' : loser?.skunk === 'skunk' ? ' Skunk!' : '';
      return `${label} wins ${score} to ${loser ? loser.score : 0}.${skunkText}`;
    }
    return `${label} scored ${event.amount}. Now ${score}, ${toGo} to go.`;
  }
  if (event.type === 'nextDeal') {
    const dealerLabel = trackLabel(state, state.dealerTrackId);
    return `Next deal. Dealer is ${dealerLabel}. Hand ${state.handNumber}.`;
  }
  return describeDealerSet(event, state);
}

/**
 * Describes an undo action. `removedEvent` is the event that was just removed (from the
 * pre-undo game); `stateAfterUndo` is the derived state of the game after the undo.
 */
export function describeUndo(removedEvent: GameEvent, stateAfterUndo: GameState): string {
  if (removedEvent.type === 'score') {
    const label = trackLabel(stateAfterUndo, removedEvent.trackId);
    return `Undid: ${label} +${removedEvent.amount}.`;
  }
  if (removedEvent.type === 'nextDeal') {
    return 'Undid: Next deal.';
  }
  const seat = stateAfterUndo.seats.find((s) => s.seatIndex === removedEvent.seatIndex);
  const label = seat ? seat.label : trackLabel(stateAfterUndo, stateAfterUndo.dealerTrackId);
  return `Undid: Dealer set to ${label}.`;
}

// Re-exported for callers that only need the track type list without deriving full state.
export type { Track };

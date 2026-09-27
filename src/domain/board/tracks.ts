// Static track/seat topology for each game format.

import type { GameFormat, Seat, Track, TrackId } from './types';

const P1: Track = { id: 'P1', label: 'Player 1', shortLabel: 'P1', color: 'red', shape: 'circle' };
const P2: Track = { id: 'P2', label: 'Player 2', shortLabel: 'P2', color: 'blue', shape: 'square' };
const P3: Track = { id: 'P3', label: 'Player 3', shortLabel: 'P3', color: 'ochre', shape: 'triangle' };
const T1: Track = { id: 'T1', label: 'Team 1', shortLabel: 'T1', color: 'red', shape: 'circle' };
const T2: Track = { id: 'T2', label: 'Team 2', shortLabel: 'T2', color: 'blue', shape: 'square' };

const TRACKS_BY_FORMAT: Record<GameFormat, Track[]> = {
  two: [P1, P2],
  three: [P1, P2, P3],
  teams: [T1, T2],
};

const SEATS_BY_FORMAT: Record<GameFormat, Seat[]> = {
  two: [
    { seatIndex: 0, label: 'Player 1', trackId: 'P1' },
    { seatIndex: 1, label: 'Player 2', trackId: 'P2' },
  ],
  three: [
    { seatIndex: 0, label: 'Player 1', trackId: 'P1' },
    { seatIndex: 1, label: 'Player 2', trackId: 'P2' },
    { seatIndex: 2, label: 'Player 3', trackId: 'P3' },
  ],
  teams: [
    { seatIndex: 0, label: 'Team 1 · A', trackId: 'T1' },
    { seatIndex: 1, label: 'Team 2 · A', trackId: 'T2' },
    { seatIndex: 2, label: 'Team 1 · B', trackId: 'T1' },
    { seatIndex: 3, label: 'Team 2 · B', trackId: 'T2' },
  ],
};

export function getTracks(format: GameFormat): Track[] {
  return TRACKS_BY_FORMAT[format];
}

export function getSeats(format: GameFormat): Seat[] {
  return SEATS_BY_FORMAT[format];
}

export function getTrackIds(format: GameFormat): TrackId[] {
  return TRACKS_BY_FORMAT[format].map((track) => track.id);
}

export function isValidTrackId(format: GameFormat, trackId: string): trackId is TrackId {
  return TRACKS_BY_FORMAT[format].some((track) => track.id === trackId);
}

export function isValidSeatIndex(format: GameFormat, seatIndex: number): boolean {
  return Number.isInteger(seatIndex) && seatIndex >= 0 && seatIndex < SEATS_BY_FORMAT[format].length;
}

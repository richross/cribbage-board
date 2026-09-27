// Pure types for the cribbage scoreboard domain model.

export type GameFormat = 'two' | 'three' | 'teams';

export type TrackId = 'P1' | 'P2' | 'P3' | 'T1' | 'T2';

export type TrackColor = 'red' | 'blue' | 'ochre';

export type TrackShape = 'circle' | 'square' | 'triangle';

export interface Track {
  id: TrackId;
  label: string;
  shortLabel: string;
  color: TrackColor;
  shape: TrackShape;
}

/** A physical seat at the table. Multiple seats can map to the same track (teams). */
export interface Seat {
  seatIndex: number;
  label: string;
  trackId: TrackId;
}

export interface ScoreEvent {
  id: string;
  type: 'score';
  trackId: TrackId;
  amount: number;
  at: number;
}

export interface NextDealEvent {
  id: string;
  type: 'nextDeal';
  at: number;
}

export interface SetDealerEvent {
  id: string;
  type: 'setDealer';
  seatIndex: number;
  at: number;
}

export type GameEvent = ScoreEvent | NextDealEvent | SetDealerEvent;

export interface Game {
  id: string;
  format: GameFormat;
  createdAt: number;
  events: GameEvent[];
}

export interface HistoryEntry {
  eventId: string;
  amount: number;
  before: number;
  after: number;
  at: number;
  hand: number;
}

export interface TrackState {
  track: Track;
  /** Cumulative score, clamped to the 121 win line. */
  score: number;
  /** Uncapped cumulative score (can exceed 121 on an overshooting final score). */
  rawScore: number;
  /** Position of the leading peg; always equal to `score`. */
  frontPeg: number;
  /** Position of the trailing peg: the track's score before its latest score event. */
  backPeg: number;
  /** Points remaining to reach 121, floored at 0. */
  toGo: number;
  history: HistoryEntry[];
}

export type Skunk = 'none' | 'skunk' | 'double';

export interface GameResult {
  winner: TrackId;
  losers: { trackId: TrackId; score: number; skunk: Skunk }[];
}

export interface GameState {
  format: GameFormat;
  tracks: TrackState[];
  seats: Seat[];
  dealerSeatIndex: number;
  dealerTrackId: TrackId;
  cribOwnerTrackId: TrackId;
  /** 1-based hand number: 1 + the number of `nextDeal` events so far. */
  handNumber: number;
  winner: TrackId | null;
  result: GameResult | null;
  lastEvent: GameEvent | null;
}

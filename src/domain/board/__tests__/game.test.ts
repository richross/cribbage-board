import { describe, expect, it } from 'vitest';
import { addScore, canUndo, GameOverError, newGame, nextDeal, setDealer, undo } from '../game';
import { deriveState } from '../deriveState';
import { getSeats, getTracks } from '../tracks';

describe('newGame', () => {
  it('creates a two-player game with P1/P2 tracks and seats, dealer at seat 0', () => {
    const game = newGame('two', 1000);
    expect(game.format).toBe('two');
    expect(game.createdAt).toBe(1000);
    expect(game.events).toEqual([]);
    expect(getTracks('two').map((t) => t.id)).toEqual(['P1', 'P2']);
    expect(getSeats('two').map((s) => s.trackId)).toEqual(['P1', 'P2']);
    const state = deriveState(game);
    expect(state.dealerSeatIndex).toBe(0);
    expect(state.dealerTrackId).toBe('P1');
    expect(state.cribOwnerTrackId).toBe('P1');
  });

  it('creates a three-player game with P1/P2/P3 tracks and seats', () => {
    const game = newGame('three');
    expect(getTracks('three').map((t) => t.id)).toEqual(['P1', 'P2', 'P3']);
    expect(getSeats('three').map((s) => s.trackId)).toEqual(['P1', 'P2', 'P3']);
    const state = deriveState(game);
    expect(state.tracks).toHaveLength(3);
    expect(state.dealerTrackId).toBe('P1');
  });

  it('creates a teams game with T1/T2 tracks and 4 alternating seats', () => {
    const game = newGame('teams');
    expect(getTracks('teams').map((t) => t.id)).toEqual(['T1', 'T2']);
    const seats = getSeats('teams');
    expect(seats.map((s) => s.trackId)).toEqual(['T1', 'T2', 'T1', 'T2']);
    expect(seats.map((s) => s.label)).toEqual([
      'Team 1 · A',
      'Team 2 · A',
      'Team 1 · B',
      'Team 2 · B',
    ]);
    const state = deriveState(game);
    expect(state.dealerTrackId).toBe('T1');
    expect(state.cribOwnerTrackId).toBe('T1');
  });

  it('gives P1/T1 red circle and P2/T2 blue square, P3 ochre triangle', () => {
    const two = getTracks('two');
    expect(two[0]).toMatchObject({ color: 'red', shape: 'circle' });
    expect(two[1]).toMatchObject({ color: 'blue', shape: 'square' });
    const three = getTracks('three');
    expect(three[2]).toMatchObject({ color: 'ochre', shape: 'triangle' });
    const teams = getTracks('teams');
    expect(teams[0]).toMatchObject({ color: 'red', shape: 'circle' });
    expect(teams[1]).toMatchObject({ color: 'blue', shape: 'square' });
  });
});

describe('addScore', () => {
  it('accumulates totals for a track', () => {
    let game = newGame('two');
    game = addScore(game, 'P1', 6);
    game = addScore(game, 'P1', 4);
    game = addScore(game, 'P2', 2);
    const state = deriveState(game);
    const p1 = state.tracks.find((t) => t.track.id === 'P1')!;
    const p2 = state.tracks.find((t) => t.track.id === 'P2')!;
    expect(p1.score).toBe(10);
    expect(p2.score).toBe(2);
  });

  it('does not mutate the original game (pure reducer)', () => {
    const game = newGame('two');
    const next = addScore(game, 'P1', 5);
    expect(game.events).toHaveLength(0);
    expect(next.events).toHaveLength(1);
  });

  it('rejects amounts outside 1..29 or non-integers', () => {
    const game = newGame('two');
    expect(() => addScore(game, 'P1', 0)).toThrow(RangeError);
    expect(() => addScore(game, 'P1', 30)).toThrow(RangeError);
    expect(() => addScore(game, 'P1', 1.5)).toThrow(RangeError);
    expect(() => addScore(game, 'P1', -1)).toThrow(RangeError);
  });

  it('rejects invalid track ids for the format', () => {
    const game = newGame('two');
    expect(() => addScore(game, 'P3', 5)).toThrow(RangeError);
  });

  it('leapfrogs front/back pegs across multiple scores', () => {
    let game = newGame('two');
    game = addScore(game, 'P1', 6);
    game = addScore(game, 'P1', 10);
    game = addScore(game, 'P1', 3);
    const state = deriveState(game);
    const p1 = state.tracks.find((t) => t.track.id === 'P1')!;
    // last score event: before=16, after=19
    expect(p1.backPeg).toBe(16);
    expect(p1.frontPeg).toBe(19);
    expect(p1.score).toBe(19);
  });

  it('records per-track history with before/after and hand numbers', () => {
    let game = newGame('two');
    game = addScore(game, 'P1', 6);
    game = nextDeal(game);
    game = addScore(game, 'P1', 4);
    const state = deriveState(game);
    const p1 = state.tracks.find((t) => t.track.id === 'P1')!;
    expect(p1.history).toHaveLength(2);
    expect(p1.history[0]).toMatchObject({ amount: 6, before: 0, after: 6, hand: 1 });
    expect(p1.history[1]).toMatchObject({ amount: 4, before: 6, after: 10, hand: 2 });
  });
});

describe('dealer rotation', () => {
  it('rotates through 2 seats with wrap', () => {
    let game = newGame('two');
    expect(deriveState(game).dealerSeatIndex).toBe(0);
    game = nextDeal(game);
    expect(deriveState(game).dealerSeatIndex).toBe(1);
    game = nextDeal(game);
    expect(deriveState(game).dealerSeatIndex).toBe(0);
  });

  it('rotates through 3 seats with wrap', () => {
    let game = newGame('three');
    game = nextDeal(game);
    game = nextDeal(game);
    expect(deriveState(game).dealerSeatIndex).toBe(2);
    game = nextDeal(game);
    expect(deriveState(game).dealerSeatIndex).toBe(0);
  });

  it('rotates through 4 seats (teams) with wrap, alternating teams; cribOwner is dealer team', () => {
    let game = newGame('teams');
    const seenTeams: string[] = [];
    let state = deriveState(game);
    seenTeams.push(state.dealerTrackId);
    for (let i = 0; i < 4; i += 1) {
      game = nextDeal(game);
      state = deriveState(game);
      seenTeams.push(state.dealerTrackId);
      expect(state.cribOwnerTrackId).toBe(state.dealerTrackId);
    }
    expect(seenTeams).toEqual(['T1', 'T2', 'T1', 'T2', 'T1']);
  });

  it('setDealer sets seat directly and subsequent nextDeal advances from there', () => {
    let game = newGame('three');
    game = setDealer(game, 2);
    expect(deriveState(game).dealerSeatIndex).toBe(2);
    game = nextDeal(game);
    expect(deriveState(game).dealerSeatIndex).toBe(0);
  });

  it('rejects invalid seat indices', () => {
    const game = newGame('two');
    expect(() => setDealer(game, 2)).toThrow(RangeError);
    expect(() => setDealer(game, -1)).toThrow(RangeError);
  });
});

describe('undo', () => {
  it('undoes a score event', () => {
    let game = newGame('two');
    game = addScore(game, 'P1', 6);
    game = undo(game);
    expect(deriveState(game).tracks[0].score).toBe(0);
    expect(game.events).toHaveLength(0);
  });

  it('undoes a nextDeal event', () => {
    let game = newGame('two');
    game = nextDeal(game);
    expect(deriveState(game).dealerSeatIndex).toBe(1);
    game = undo(game);
    expect(deriveState(game).dealerSeatIndex).toBe(0);
  });

  it('undoes a setDealer event', () => {
    let game = newGame('three');
    game = setDealer(game, 2);
    game = undo(game);
    expect(deriveState(game).dealerSeatIndex).toBe(0);
  });

  it('is a no-op on an empty ledger', () => {
    const game = newGame('two');
    expect(canUndo(game)).toBe(false);
    const same = undo(game);
    expect(same.events).toEqual(game.events);
  });

  it('removes only the last event regardless of type', () => {
    let game = newGame('two');
    game = addScore(game, 'P1', 6);
    game = nextDeal(game);
    game = addScore(game, 'P2', 3);
    game = undo(game);
    expect(game.events).toHaveLength(2);
    expect(game.events[game.events.length - 1].type).toBe('nextDeal');
  });
});

describe('winning and skunks', () => {
  it('locks the game at exactly 121', () => {
    let game = newGame('two');
    game = addScore(game, 'P1', 29);
    game = addScore(game, 'P1', 29);
    game = addScore(game, 'P1', 29);
    game = addScore(game, 'P1', 29);
    game = addScore(game, 'P1', 5); // 116 + 5 = 121
    const state = deriveState(game);
    expect(state.winner).toBe('P1');
    expect(state.tracks[0].score).toBe(121);
    expect(state.result?.winner).toBe('P1');
  });

  it('clamps an overshooting score to 121 while keeping rawScore', () => {
    let game = newGame('two');
    game = addScore(game, 'P1', 29);
    game = addScore(game, 'P1', 29);
    game = addScore(game, 'P1', 29);
    game = addScore(game, 'P1', 29);
    game = addScore(game, 'P1', 9); // 116 + 9 = 125
    const state = deriveState(game);
    const p1 = state.tracks.find((t) => t.track.id === 'P1')!;
    expect(p1.rawScore).toBe(125);
    expect(p1.score).toBe(121);
  });

  it('rejects scoring after a win', () => {
    let game = newGame('two');
    for (let i = 0; i < 4; i += 1) game = addScore(game, 'P1', 29);
    game = addScore(game, 'P1', 5); // wins at 121
    expect(() => addScore(game, 'P2', 5)).toThrow(GameOverError);
    expect(() => nextDeal(game)).toThrow(GameOverError);
    expect(() => setDealer(game, 1)).toThrow(GameOverError);
  });

  it('reopens the game when the winning event is undone', () => {
    let game = newGame('two');
    for (let i = 0; i < 4; i += 1) game = addScore(game, 'P1', 29);
    game = addScore(game, 'P1', 5); // wins
    expect(deriveState(game).winner).toBe('P1');
    game = undo(game);
    expect(deriveState(game).winner).toBeNull();
    // scoring is allowed again
    game = addScore(game, 'P2', 3);
    expect(deriveState(game).tracks[1].score).toBe(3);
  });

  it('computes skunk boundaries for losers in a 3-player game', () => {
    const build = (loserScore: number) => {
      let game = newGame('three');
      if (loserScore > 0) {
        let loserRemaining = loserScore;
        while (loserRemaining > 0) {
          const amt = Math.min(29, loserRemaining);
          game = addScore(game, 'P2', amt);
          loserRemaining -= amt;
        }
      }
      // Winner reaches 121 in one big jump isn't allowed (max 29/event); build up with 29s + remainder.
      let remaining = 121;
      while (remaining > 0) {
        const amt = Math.min(29, remaining);
        game = addScore(game, 'P1', amt);
        remaining -= amt;
      }
      return game;
    };

    expect(deriveState(build(60)).result?.losers.find((l) => l.trackId === 'P2')?.skunk).toBe(
      'double',
    );
    expect(deriveState(build(61)).result?.losers.find((l) => l.trackId === 'P2')?.skunk).toBe(
      'skunk',
    );
    expect(deriveState(build(90)).result?.losers.find((l) => l.trackId === 'P2')?.skunk).toBe(
      'skunk',
    );
    expect(deriveState(build(91)).result?.losers.find((l) => l.trackId === 'P2')?.skunk).toBe(
      'none',
    );
  });

  it('lists a P3 loser with 0 points as double skunk', () => {
    let game = newGame('three');
    let remaining = 121;
    while (remaining > 0) {
      const amt = Math.min(29, remaining);
      game = addScore(game, 'P1', amt);
      remaining -= amt;
    }
    const state = deriveState(game);
    const p3 = state.result?.losers.find((l) => l.trackId === 'P3');
    expect(p3?.score).toBe(0);
    expect(p3?.skunk).toBe('double');
  });
});

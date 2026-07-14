import type { Game, Player } from '@/context/games-context';
import { base } from '@/game-types/base';
import { phase10 } from '@/game-types/phase10';
import { getGameType } from '@/game-types/registry';

function player(id: string, name: string): Player {
  return { id, name };
}

function game(overrides: Partial<Game> & Pick<Game, 'id' | 'players' | 'rounds'>): Game {
  return {
    name: 'Test Game',
    rankByLowest: false,
    createdAt: 1_000_000,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getGameType
// ---------------------------------------------------------------------------

describe('getGameType', () => {
  it('returns the phase10 definition for a phase10 game', () => {
    const g = game({ id: 'g1', players: [], rounds: [], gameType: 'phase10' });
    expect(getGameType(g)).toBe(phase10);
  });

  it('returns the base definition for a regular game', () => {
    const g = game({ id: 'g1', players: [], rounds: [] });
    expect(getGameType(g)).toBe(base);
  });

  it('returns the base definition for an undefined game', () => {
    expect(getGameType(undefined)).toBe(base);
  });
});

// ---------------------------------------------------------------------------
// base
// ---------------------------------------------------------------------------

describe('base game type', () => {
  it('sortPlayers ranks by highest total by default', () => {
    const alice = player('p1', 'Alice');
    const bob = player('p2', 'Bob');
    const g = game({ id: 'g1', players: [alice, bob], rounds: [] });
    const sorted = base.sortPlayers(g, [alice, bob], { p1: 10, p2: 20 });
    expect(sorted.map(p => p.id)).toEqual(['p2', 'p1']);
  });

  it('sortPlayers ranks by lowest total when rankByLowest is set', () => {
    const alice = player('p1', 'Alice');
    const bob = player('p2', 'Bob');
    const g = game({ id: 'g1', players: [alice, bob], rounds: [], rankByLowest: true });
    const sorted = base.sortPlayers(g, [alice, bob], { p1: 10, p2: 20 });
    expect(sorted.map(p => p.id)).toEqual(['p1', 'p2']);
  });

  it('isFinalRound is true once currentRoundIndex reaches the last round', () => {
    const g = game({ id: 'g1', players: [], rounds: [], totalRounds: 5 });
    expect(base.isFinalRound(g, 3)).toBe(false);
    expect(base.isFinalRound(g, 4)).toBe(true);
  });

  it('isFinalRound is false for an endless (no totalRounds) game', () => {
    const g = game({ id: 'g1', players: [], rounds: [] });
    expect(base.isFinalRound(g, 100)).toBe(false);
  });

  it('finishButtonLabel is "Show Final Scores"', () => {
    expect(base.finishButtonLabel).toBe('Show Final Scores');
  });

  it('secondaryStat returns null', () => {
    const g = game({ id: 'g1', players: [], rounds: [] });
    expect(base.secondaryStat?.(g, 'p1')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// phase10
// ---------------------------------------------------------------------------

describe('phase10 game type', () => {
  it('sortPlayers ranks by phase reached first, then lowest total as tiebreaker', () => {
    const alice = player('p1', 'Alice');
    const bob = player('p2', 'Bob');
    // Alice phased in round 0 (now on phase 2); Bob has not phased (still on phase 1).
    const g = game({
      id: 'g1',
      players: [alice, bob],
      rounds: [{ p1: 5, p2: 3 }, {}],
      gameType: 'phase10',
      currentRound: 1,
      phasedRounds: [{ p1: true }],
    });
    const sorted = phase10.sortPlayers(g, [alice, bob], { p1: 50, p2: 10 });
    expect(sorted.map(p => p.id)).toEqual(['p1', 'p2']);
  });

  it('sortPlayers breaks a same-phase tie by lowest total', () => {
    const alice = player('p1', 'Alice');
    const bob = player('p2', 'Bob');
    const g = game({ id: 'g1', players: [alice, bob], rounds: [], gameType: 'phase10' });
    const sorted = phase10.sortPlayers(g, [alice, bob], { p1: 30, p2: 10 });
    expect(sorted.map(p => p.id)).toEqual(['p2', 'p1']);
  });

  it('isFinalRound is true the round a player completes phase 10', () => {
    const alice = player('p1', 'Alice');
    const g = game({
      id: 'g1',
      players: [alice],
      rounds: [{}],
      gameType: 'phase10',
      phasedRounds: [{ p1: true }],
      currentRound: 1,
    });
    // Alice was on phase 10 during round 0 and phased out -> game won at round 0.
    // Simulate by pre-seeding 9 phased rounds so round 9 completes phase 10.
    const nineRounds = Array.from({ length: 10 }, () => ({ p1: true }));
    const wonGame = game({
      id: 'g2',
      players: [alice],
      rounds: nineRounds.map(() => ({})),
      gameType: 'phase10',
      phasedRounds: nineRounds,
      currentRound: 10,
    });
    expect(phase10.isFinalRound(wonGame, 9)).toBe(true);
    expect(phase10.isFinalRound(g, 0)).toBe(false);
  });

  it('finishButtonLabel is "Finish Game"', () => {
    expect(phase10.finishButtonLabel).toBe('Finish Game');
  });

  it('secondaryStat returns the current phase label', () => {
    const alice = player('p1', 'Alice');
    const g = game({
      id: 'g1',
      players: [alice],
      rounds: [{ p1: 5 }],
      gameType: 'phase10',
      currentRound: 1,
      phasedRounds: [{ p1: true }],
    });
    expect(phase10.secondaryStat?.(g, 'p1')).toEqual({ short: 'Phase 2', long: 'Phase 2' });
  });
});

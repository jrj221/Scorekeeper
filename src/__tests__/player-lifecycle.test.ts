/**
 * Tests for the four key repeated-use scenarios:
 *
 * 1. Deleting a player from globalPlayers must NOT alter game records.
 * 2. Deleting a game must reduce / recalculate every affected player's stats.
 * 3. A player deleted then re-added with the same name gets a brand-new ID;
 *    old games keep the original ID; the two players' stats never mix.
 */

import { getGameTotals, getPlayerWinRate } from '@/utils/game';
import type { Game, GlobalPlayer, Player } from '@/context/games-context';

// ---------------------------------------------------------------------------
// Helpers — mirror the pure state transformations performed by GamesContext
// ---------------------------------------------------------------------------

function player(id: string, name: string): Player & GlobalPlayer {
  return { id, name };
}

function game(
  id: string,
  players: Player[],
  rounds: Record<string, number>[],
  opts: { rankByLowest?: boolean; finishedAt?: number } = {},
): Game {
  return {
    id,
    name: 'Test Game',
    players,
    rounds,
    rankByLowest: opts.rankByLowest ?? false,
    createdAt: 1_000_000,
    finishedAt: opts.finishedAt,
  };
}

// Mirrors removeGlobalPlayer: only touches globalPlayers, never games.
function removeGlobal(list: GlobalPlayer[], id: string): GlobalPlayer[] {
  return list.filter(p => p.id !== id);
}

// Mirrors deleteGame.
function deleteGame(games: Game[], id: string): Game[] {
  return games.filter(g => g.id !== id);
}

// Mirrors addGlobalPlayer (deduplicates by name, returns unchanged list if found).
function addGlobal(
  list: GlobalPlayer[],
  name: string,
  newId: string,
): GlobalPlayer[] {
  const trimmed = name.trim();
  if (list.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) return list;
  return [...list, { id: newId, name: trimmed }];
}

// ---------------------------------------------------------------------------
// Scenario 1 — Deleting a player does NOT remove them from existing games
// ---------------------------------------------------------------------------

describe('removing a player from globalPlayers', () => {
  it('does not change the game player list', () => {
    const alice = player('gp_alice', 'Alice');
    const bob   = player('gp_bob',   'Bob');
    const g = game('g1', [alice, bob], [{ gp_alice: 20, gp_bob: 10 }], { finishedAt: 1 });

    const updated = removeGlobal([alice, bob], alice.id);

    expect(updated.find(p => p.id === alice.id)).toBeUndefined();       // gone globally
    expect(g.players.find(p => p.id === alice.id)).toBeDefined();       // still in game
  });

  it('leaves historic scores intact after global removal', () => {
    const alice = player('gp_alice', 'Alice');
    const bob   = player('gp_bob',   'Bob');
    const g = game('g1', [alice, bob], [{ gp_alice: 30, gp_bob: 10 }], { finishedAt: 1 });

    removeGlobal([alice, bob], alice.id); // remove from list — game is untouched
    expect(getGameTotals(g)[alice.id]).toBe(30);
  });

  it('still allows computing win rate from the game record after removal', () => {
    const alice = player('gp_alice', 'Alice');
    const bob   = player('gp_bob',   'Bob');
    const g = game('g1', [alice, bob], [{ gp_alice: 30, gp_bob: 10 }], { finishedAt: 1 });

    removeGlobal([alice, bob], alice.id);
    expect(getPlayerWinRate(alice.id, [g])).toBe('100%');
  });
});

// ---------------------------------------------------------------------------
// Scenario 2 — Deleting a game changes every involved player's stats
// ---------------------------------------------------------------------------

describe('deleting a game', () => {
  it('reduces win rate when a won game is deleted', () => {
    const alice = player('gp_alice', 'Alice');
    const bob   = player('gp_bob',   'Bob');
    const games = [
      game('g1', [alice, bob], [{ gp_alice: 30, gp_bob: 10 }], { finishedAt: 1 }), // alice wins
      game('g2', [alice, bob], [{ gp_alice:  5, gp_bob: 20 }], { finishedAt: 2 }), // bob wins
      game('g3', [alice, bob], [{ gp_alice: 25, gp_bob: 10 }], { finishedAt: 3 }), // alice wins
    ];

    expect(getPlayerWinRate(alice.id, games)).toBe('67%');

    const after = deleteGame(games, 'g1');
    expect(getPlayerWinRate(alice.id, after)).toBe('50%');
  });

  it('increases win rate when a lost game is deleted', () => {
    const alice = player('gp_alice', 'Alice');
    const bob   = player('gp_bob',   'Bob');
    const games = [
      game('g1', [alice, bob], [{ gp_alice: 30, gp_bob: 10 }], { finishedAt: 1 }), // alice wins
      game('g2', [alice, bob], [{ gp_alice:  5, gp_bob: 20 }], { finishedAt: 2 }), // bob wins
    ];

    expect(getPlayerWinRate(alice.id, games)).toBe('50%');

    const after = deleteGame(games, 'g2');
    expect(getPlayerWinRate(alice.id, after)).toBe('100%');
  });

  it('returns -- once all games for a player are deleted', () => {
    const alice = player('gp_alice', 'Alice');
    const bob   = player('gp_bob',   'Bob');
    const games = [game('g1', [alice, bob], [{ gp_alice: 10, gp_bob: 5 }], { finishedAt: 1 })];

    const after = deleteGame(games, 'g1');
    expect(getPlayerWinRate(alice.id, after)).toBe('--');
  });

  it('does not affect the stats of players not in the deleted game', () => {
    const alice = player('gp_alice', 'Alice');
    const bob   = player('gp_bob',   'Bob');
    const carol = player('gp_carol', 'Carol');
    const games = [
      game('g1', [alice, bob],   [{ gp_alice: 10, gp_bob: 5  }], { finishedAt: 1 }),
      game('g2', [alice, carol], [{ gp_alice: 10, gp_carol: 5 }], { finishedAt: 2 }),
    ];

    const after = deleteGame(games, 'g1');
    // Carol was never in g1 — her stats are unchanged
    expect(getPlayerWinRate(carol.id, after)).toBe('0%');
    // Alice still has g2
    expect(getPlayerWinRate(alice.id, after)).toBe('100%');
  });
});

// ---------------------------------------------------------------------------
// Scenario 3 — Delete a player, add a new one with the same name
// ---------------------------------------------------------------------------

describe('delete then re-add a player with the same name', () => {
  it('creates a new player with a distinct ID', () => {
    const original = player('gp_alice_v1', 'Alice');
    let globals = [original];

    globals = removeGlobal(globals, original.id);
    globals = addGlobal(globals, 'Alice', 'gp_alice_v2');

    const newAlice = globals.find(p => p.name === 'Alice');
    expect(newAlice).toBeDefined();
    expect(newAlice!.id).toBe('gp_alice_v2');
    expect(newAlice!.id).not.toBe(original.id);
  });

  it('old games still reference the original player ID', () => {
    const original = player('gp_alice_v1', 'Alice');
    const bob      = player('gp_bob',      'Bob');
    const oldGame  = game(
      'g1',
      [original, bob],
      [{ gp_alice_v1: 30, gp_bob: 10 }],
      { finishedAt: 1 },
    );

    let globals = [original, bob];
    globals = removeGlobal(globals, original.id);
    globals = addGlobal(globals, 'Alice', 'gp_alice_v2');

    // Old game record is immutable — original ID still there
    expect(oldGame.players[0].id).toBe('gp_alice_v1');
    expect(getGameTotals(oldGame)['gp_alice_v1']).toBe(30);
  });

  it('new player has no win rate derived from old games', () => {
    const original = player('gp_alice_v1', 'Alice');
    const bob      = player('gp_bob',      'Bob');
    const oldGame  = game(
      'g1',
      [original, bob],
      [{ gp_alice_v1: 30, gp_bob: 10 }],
      { finishedAt: 1 },
    );

    // New Alice is not in any game
    expect(getPlayerWinRate('gp_alice_v2', [oldGame])).toBe('--');
  });

  it('original and new player stats are fully independent', () => {
    const original = player('gp_alice_v1', 'Alice');
    const newAlice = player('gp_alice_v2', 'Alice');
    const bob      = player('gp_bob',      'Bob');

    const games = [
      // Original Alice wins g1
      game('g1', [original, bob], [{ gp_alice_v1: 30, gp_bob: 10 }], { finishedAt: 1 }),
      // New Alice loses g2
      game('g2', [newAlice, bob], [{ gp_alice_v2: 5, gp_bob: 20  }], { finishedAt: 2 }),
    ];

    expect(getPlayerWinRate(original.id, games)).toBe('100%'); // won g1, not in g2
    expect(getPlayerWinRate(newAlice.id,  games)).toBe('0%');  // lost g2, not in g1
  });

  it('addGlobal is a no-op when the same name is re-added before removing', () => {
    const original = player('gp_alice_v1', 'Alice');
    const globals  = [original];

    // If original Alice is still in the list, adding "Alice" returns the same list
    const result = addGlobal(globals, 'Alice', 'gp_alice_v2');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(original.id);
  });
});

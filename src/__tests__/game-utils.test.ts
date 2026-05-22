import { buildTiers, getGameTotals, getGameWinnerLabel, getPlayerWinRate } from '@/utils/game';
import type { Game, Player } from '@/context/games-context';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function player(id: string, name: string): Player {
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

// ---------------------------------------------------------------------------
// getGameTotals
// ---------------------------------------------------------------------------

describe('getGameTotals', () => {
  it('sums scores across all rounds', () => {
    const alice = player('p1', 'Alice');
    const bob   = player('p2', 'Bob');
    const g = game('g1', [alice, bob], [{ p1: 10, p2: 5 }, { p1: 3, p2: 8 }]);
    expect(getGameTotals(g)).toEqual({ p1: 13, p2: 13 });
  });

  it('defaults missing round entries to 0', () => {
    const alice = player('p1', 'Alice');
    const g = game('g1', [alice], [{ p1: 10 }, {}]);
    expect(getGameTotals(g)['p1']).toBe(10);
  });

  it('returns 0 for a player with no rounds', () => {
    const alice = player('p1', 'Alice');
    const g = game('g1', [alice], []);
    expect(getGameTotals(g)).toEqual({ p1: 0 });
  });

  it('handles negative scores (e.g. Poker)', () => {
    const alice = player('p1', 'Alice');
    const bob   = player('p2', 'Bob');
    const g = game('g1', [alice, bob], [{ p1: 20, p2: -10 }, { p1: -15, p2: 30 }]);
    expect(getGameTotals(g)).toEqual({ p1: 5, p2: 20 });
  });
});

// ---------------------------------------------------------------------------
// getGameWinnerLabel
// ---------------------------------------------------------------------------

describe('getGameWinnerLabel', () => {
  it('returns the sole winner by name', () => {
    const alice = player('p1', 'Alice');
    const bob   = player('p2', 'Bob');
    const g = game('g1', [alice, bob], [{ p1: 20, p2: 10 }], { finishedAt: 1 });
    expect(getGameWinnerLabel(g)).toBe('🏆 Alice');
  });

  it('returns 2-way tie label when two players are equal', () => {
    const alice = player('p1', 'Alice');
    const bob   = player('p2', 'Bob');
    const g = game('g1', [alice, bob], [{ p1: 10, p2: 10 }], { finishedAt: 1 });
    expect(getGameWinnerLabel(g)).toBe('🤝 2-way Tie');
  });

  it('returns 3-way tie label when three players are equal', () => {
    const players = ['p1', 'p2', 'p3'].map(id => player(id, id));
    const g = game('g1', players, [{ p1: 10, p2: 10, p3: 10 }], { finishedAt: 1 });
    expect(getGameWinnerLabel(g)).toBe('🤝 3-way Tie');
  });

  it('picks the lowest score as winner when rankByLowest is true', () => {
    const alice = player('p1', 'Alice');
    const bob   = player('p2', 'Bob');
    const g = game('g1', [alice, bob], [{ p1: 3, p2: 10 }], { rankByLowest: true, finishedAt: 1 });
    expect(getGameWinnerLabel(g)).toBe('🏆 Alice');
  });

  it('returns empty string for a game that has not finished', () => {
    const alice = player('p1', 'Alice');
    const g = game('g1', [alice], [{ p1: 10 }]);
    expect(getGameWinnerLabel(g)).toBe('');
  });
});

// ---------------------------------------------------------------------------
// getPlayerWinRate
// ---------------------------------------------------------------------------

describe('getPlayerWinRate', () => {
  it('returns -- when no finished games exist', () => {
    expect(getPlayerWinRate('p1', [])).toBe('--');
  });

  it('returns 100% when the player wins every game', () => {
    const alice = player('p1', 'Alice');
    const bob   = player('p2', 'Bob');
    const games = [
      game('g1', [alice, bob], [{ p1: 10, p2: 5 }], { finishedAt: 1 }),
      game('g2', [alice, bob], [{ p1: 8,  p2: 3 }], { finishedAt: 2 }),
    ];
    expect(getPlayerWinRate('p1', games)).toBe('100%');
  });

  it('returns 50% when the player wins half their games', () => {
    const alice = player('p1', 'Alice');
    const bob   = player('p2', 'Bob');
    const games = [
      game('g1', [alice, bob], [{ p1: 10, p2: 5 }], { finishedAt: 1 }),
      game('g2', [alice, bob], [{ p1: 3,  p2: 8 }], { finishedAt: 2 }),
    ];
    expect(getPlayerWinRate('p1', games)).toBe('50%');
  });

  it('counts tied games as a win for every tied player', () => {
    const alice = player('p1', 'Alice');
    const bob   = player('p2', 'Bob');
    const g = game('g1', [alice, bob], [{ p1: 10, p2: 10 }], { finishedAt: 1 });
    expect(getPlayerWinRate('p1', [g])).toBe('100%');
    expect(getPlayerWinRate('p2', [g])).toBe('100%');
  });

  it('ignores finished games the player was not part of', () => {
    const alice = player('p1', 'Alice');
    const bob   = player('p2', 'Bob');
    const carol = player('p3', 'Carol');
    const games = [
      game('g1', [alice, bob],  [{ p1: 10, p2: 5  }], { finishedAt: 1 }), // alice wins
      game('g2', [bob,  carol], [{ p2: 10, p3: 5  }], { finishedAt: 2 }), // alice not present
    ];
    expect(getPlayerWinRate('p1', games)).toBe('100%');
  });

  it('returns -- when the player has no finished games in the list', () => {
    const alice = player('p1', 'Alice');
    const bob   = player('p2', 'Bob');
    const g = game('g1', [alice, bob], [{ p1: 10, p2: 5 }]); // not finished
    expect(getPlayerWinRate('p1', [g])).toBe('--');
  });
});

// ---------------------------------------------------------------------------
// buildTiers
// ---------------------------------------------------------------------------

describe('buildTiers', () => {
  it('puts each player in their own tier when no scores are equal', () => {
    const players = [player('p1', 'Alice'), player('p2', 'Bob'), player('p3', 'Carol')];
    const totals  = { p1: 30, p2: 20, p3: 10 };
    const tiers   = buildTiers(players, totals);
    expect(tiers).toHaveLength(3);
    expect(tiers[0]).toEqual([players[0]]);
    expect(tiers[1]).toEqual([players[1]]);
    expect(tiers[2]).toEqual([players[2]]);
  });

  it('groups two tied first-place players into tier 0', () => {
    const players = [player('p1', 'Alice'), player('p2', 'Bob'), player('p3', 'Carol')];
    const totals  = { p1: 30, p2: 30, p3: 10 };
    const tiers   = buildTiers(players, totals);
    expect(tiers).toHaveLength(2);
    expect(tiers[0].map(p => p.id).sort()).toEqual(['p1', 'p2']);
    expect(tiers[1]).toEqual([players[2]]);
  });

  it('puts everyone in one tier when all scores are equal', () => {
    const players = ['p1', 'p2', 'p3'].map(id => player(id, id));
    const totals  = { p1: 10, p2: 10, p3: 10 };
    const tiers   = buildTiers(players, totals);
    expect(tiers).toHaveLength(1);
    expect(tiers[0]).toHaveLength(3);
  });

  it('handles a 3-way tie for 2nd place', () => {
    const players = ['p1', 'p2', 'p3', 'p4'].map(id => player(id, id));
    const totals  = { p1: 40, p2: 20, p3: 20, p4: 20 };
    const tiers   = buildTiers(players, totals);
    expect(tiers).toHaveLength(2);
    expect(tiers[0]).toHaveLength(1);
    expect(tiers[1]).toHaveLength(3);
  });

  it('assigns rest-list dense ranks starting at 4 (tierIdx + 4)', () => {
    // 3 distinct podium tiers, then a 2-way tie for 4th, then a 5th
    const players = ['p1','p2','p3','p4','p5','p6'].map(id => player(id, id));
    const totals  = { p1: 60, p2: 50, p3: 40, p4: 30, p5: 30, p6: 10 };
    const tiers   = buildTiers(players, totals);
    const restTiers = tiers.slice(3);
    expect(restTiers[0].map(p => p.id).sort()).toEqual(['p4', 'p5']); // both rank #4
    expect(restTiers[1].map(p => p.id)).toEqual(['p6']);               // rank #5
    // dense rank formula used in the UI
    const ranks = restTiers.map((_, i) => i + 4);
    expect(ranks).toEqual([4, 5]);
  });
});

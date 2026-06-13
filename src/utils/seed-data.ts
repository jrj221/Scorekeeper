import { Game, GameTemplate, GlobalPlayer, PlayerGroup } from '@/context/games-context';

function id(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function daysAgo(n: number) {
  return Date.now() - n * 86_400_000;
}

export function buildSeedData(): {
  globalPlayers: GlobalPlayer[];
  games: Game[];
  templates: GameTemplate[];
  groups: PlayerGroup[];
} {
  const alice: GlobalPlayer = { id: 'gp_seed_alice', name: 'Alice' };
  const bob: GlobalPlayer = { id: 'gp_seed_bob', name: 'Bob' };
  const carol: GlobalPlayer = { id: 'gp_seed_carol', name: 'Carol' };
  const dan: GlobalPlayer = { id: 'gp_seed_dan', name: 'Dan' };

  const globalPlayers: GlobalPlayer[] = [alice, bob, carol, dan];

  // Finished game — 5 rounds, highest wins
  const g1: Game = {
    id: id('game'),
    name: 'Catan Night',
    players: [alice, bob, carol],
    rounds: [
      { [alice.id]: 4, [bob.id]: 3, [carol.id]: 5 },
      { [alice.id]: 7, [bob.id]: 6, [carol.id]: 4 },
      { [alice.id]: 3, [bob.id]: 8, [carol.id]: 6 },
      { [alice.id]: 9, [bob.id]: 5, [carol.id]: 7 },
      { [alice.id]: 6, [bob.id]: 4, [carol.id]: 3 },
    ],
    totalRounds: 5,
    rankByLowest: false,
    createdAt: daysAgo(7),
    finishedAt: daysAgo(7),
  };

  // Finished game — lowest wins
  const g2: Game = {
    id: id('game'),
    name: 'Golf (Low)',
    players: [alice, bob, dan],
    rounds: [
      { [alice.id]: 4, [bob.id]: 5, [dan.id]: 3 },
      { [alice.id]: 3, [bob.id]: 4, [dan.id]: 6 },
      { [alice.id]: 5, [bob.id]: 3, [dan.id]: 4 },
    ],
    totalRounds: 3,
    rankByLowest: true,
    createdAt: daysAgo(3),
    finishedAt: daysAgo(3),
  };

  // In-progress game — indefinite rounds
  const g3: Game = {
    id: id('game'),
    name: 'Poker Night',
    players: [alice, bob, carol, dan],
    rounds: [
      { [alice.id]: 20, [bob.id]: -10, [carol.id]: 15, [dan.id]: -5 },
      { [alice.id]: -15, [bob.id]: 30, [carol.id]: -10, [dan.id]: 5 },
    ],
    rankByLowest: false,
    createdAt: daysAgo(1),
  };

  // In-progress game — early stages
  const g4: Game = {
    id: id('game'),
    name: 'Scrabble',
    players: [bob, carol],
    rounds: [
      { [bob.id]: 28, [carol.id]: 34 },
    ],
    totalRounds: 10,
    rankByLowest: false,
    createdAt: daysAgo(0),
  };

  const games: Game[] = [g3, g4, g1, g2];

  const templates: GameTemplate[] = [
    {
      id: id('tmpl'),
      name: 'Catan Night',
      totalRounds: 5,
      rankByLowest: false,
      createdAt: daysAgo(7),
    },
    {
      id: id('tmpl'),
      name: 'Golf (Low)',
      totalRounds: 18,
      rankByLowest: true,
      createdAt: daysAgo(3),
    },
    {
      id: id('tmpl'),
      name: 'Quick Poker',
      rankByLowest: false,
      createdAt: daysAgo(1),
    },
  ];

  const groups: PlayerGroup[] = [
    {
      id: 'grp_seed_friday',
      name: 'Friday Crew',
      playerIds: [alice.id, bob.id, carol.id],
    },
    {
      id: 'grp_seed_all',
      name: 'Everyone',
      playerIds: [alice.id, bob.id, carol.id, dan.id],
    },
  ];

  return { globalPlayers, games, templates, groups };
}

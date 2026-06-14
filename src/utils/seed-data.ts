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
  const phoebe: GlobalPlayer = { id: 'gp_seed_phoebe', name: 'Phoebe' };
  const monica: GlobalPlayer = { id: 'gp_seed_monica', name: 'Monica' };
  const chandler: GlobalPlayer = { id: 'gp_seed_chandler', name: 'Chandler' };
  const ross: GlobalPlayer = { id: 'gp_seed_ross', name: 'Ross' };
  const joey: GlobalPlayer = { id: 'gp_seed_joey', name: 'Joey' };
  const rachel: GlobalPlayer = { id: 'gp_seed_rachel', name: 'Rachel' };

  const globalPlayers: GlobalPlayer[] = [phoebe, monica, chandler, ross, joey, rachel];

  // Finished game — whole friend group, two-way tie at the top (Monica & Ross both 74).
  const gYahtzee: Game = {
    id: id('game'),
    name: 'Yahtzee',
    icon: 'dice',
    players: [phoebe, monica, chandler, ross, joey, rachel],
    rounds: [
      { [phoebe.id]: 20, [monica.id]: 30, [chandler.id]: 25, [ross.id]: 28, [joey.id]: 15, [rachel.id]: 22 },
      { [phoebe.id]: 18, [monica.id]: 25, [chandler.id]: 20, [ross.id]: 22, [joey.id]: 30, [rachel.id]: 19 },
      { [phoebe.id]: 24, [monica.id]: 19, [chandler.id]: 28, [ross.id]: 24, [joey.id]: 21, [rachel.id]: 26 },
    ],
    totalRounds: 13,
    rankByLowest: false,
    createdAt: daysAgo(9),
    finishedAt: daysAgo(9),
  };

  // In-progress game — lowest wins, the girls only, on the final round.
  const gFiveCrown: Game = {
    id: id('game'),
    name: 'Five Crown',
    icon: 'crown',
    players: [phoebe, monica, rachel],
    rounds: [
      { [phoebe.id]: 15, [monica.id]: 10, [rachel.id]: 20 },
      { [phoebe.id]: 12, [monica.id]: 18, [rachel.id]: 8 },
      { [phoebe.id]: 9, [monica.id]: 14, [rachel.id]: 11 },
      { [phoebe.id]: 7, [monica.id]: 20, [rachel.id]: 15 },
      { [phoebe.id]: 13, [monica.id]: 9, [rachel.id]: 22 },
      { [phoebe.id]: 5, [monica.id]: 16, [rachel.id]: 18 },
      { [phoebe.id]: 11, [monica.id]: 13, [rachel.id]: 10 },
      { [phoebe.id]: 8, [monica.id]: 19, [rachel.id]: 14 },
      { [phoebe.id]: 6, [monica.id]: 12, [rachel.id]: 17 },
      { [phoebe.id]: 10, [monica.id]: 15, [rachel.id]: 9 },
    ],
    totalRounds: 11,
    rankByLowest: true,
    createdAt: daysAgo(5),
  };

  // In-progress game — Scrabble.
  const gScrabble: Game = {
    id: id('game'),
    name: 'Scrabble',
    icon: 'font',
    players: [ross, rachel, joey],
    rounds: [
      { [ross.id]: 34, [rachel.id]: 28, [joey.id]: 22 },
      { [ross.id]: 19, [rachel.id]: 41, [joey.id]: 30 },
    ],
    rankByLowest: false,
    createdAt: daysAgo(2),
  };

  // In-progress game — Catan.
  const gCatan: Game = {
    id: id('game'),
    name: 'Catan',
    players: [chandler, monica, joey, ross],
    rounds: [
      { [chandler.id]: 4, [monica.id]: 6, [joey.id]: 3, [ross.id]: 5 },
      { [chandler.id]: 7, [monica.id]: 5, [joey.id]: 8, [ross.id]: 4 },
    ],
    rankByLowest: false,
    createdAt: daysAgo(1),
  };

  // In-progress game — Rummy.
  const gRummy: Game = {
    id: id('game'),
    name: 'Rummy',
    players: [phoebe, chandler, rachel],
    rounds: [
      { [phoebe.id]: 25, [chandler.id]: 40, [rachel.id]: 30 },
      { [phoebe.id]: 35, [chandler.id]: 15, [rachel.id]: 45 },
    ],
    rankByLowest: false,
    createdAt: daysAgo(0),
  };

  const games: Game[] = [gRummy, gCatan, gScrabble, gFiveCrown, gYahtzee];

  const templates: GameTemplate[] = [
    {
      id: id('tmpl'),
      name: 'Yahtzee',
      icon: 'dice',
      totalRounds: 13,
      rankByLowest: false,
      createdAt: daysAgo(10),
    },
    {
      id: id('tmpl'),
      name: 'Scrabble',
      icon: 'font',
      rankByLowest: false,
      createdAt: daysAgo(8),
    },
    {
      id: id('tmpl'),
      name: 'Five Crown',
      icon: 'crown',
      totalRounds: 11,
      rankByLowest: true,
      createdAt: daysAgo(6),
    },
  ];

  const groups: PlayerGroup[] = [
    {
      id: 'grp_seed_girls',
      name: 'The Girls',
      playerIds: [phoebe.id, monica.id, rachel.id],
    },
    {
      id: 'grp_seed_friends',
      name: 'Friends',
      playerIds: [phoebe.id, monica.id, chandler.id, ross.id, joey.id, rachel.id],
    },
  ];

  return { globalPlayers, games, templates, groups };
}

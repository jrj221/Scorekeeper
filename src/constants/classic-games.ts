import { GameTemplate, GameType } from '@/context/games-context';

export type ClassicGame = GameTemplate & { gameType: GameType };

export const CLASSIC_GAMES: ClassicGame[] = [
  {
    id: 'phase10',
    name: 'Phase 10',
    icon: 'users',
    gameType: 'phase10',
    rankByLowest: true,
    totalRounds: undefined,
    lockedFields: ['rounds', 'rankByLowest', 'extras.dice', 'extras.timer', 'icon', 'name', 'phaseSubset'],
    createdAt: 0,
  },
];

export function getClassicGame(id: string): ClassicGame | undefined {
  return CLASSIC_GAMES.find(c => c.id === id);
}

export const PHASE_10_PHASES: { number: number; description: string }[] = [
  { number: 1, description: '2 sets of 3' },
  { number: 2, description: '1 set of 3 + 1 run of 4' },
  { number: 3, description: '1 set of 4 + 1 run of 4' },
  { number: 4, description: '1 run of 7' },
  { number: 5, description: '1 run of 8' },
  { number: 6, description: '1 run of 9' },
  { number: 7, description: '2 sets of 4' },
  { number: 8, description: '7 cards of one color' },
  { number: 9, description: '1 set of 5 + 1 set of 2' },
  { number: 10, description: '1 set of 5 + 1 set of 3' },
];

export function getVisiblePhases(subset?: 'odd' | 'even') {
  if (subset === 'odd') return PHASE_10_PHASES.filter(p => p.number % 2 === 1);
  if (subset === 'even') return PHASE_10_PHASES.filter(p => p.number % 2 === 0);
  return PHASE_10_PHASES;
}

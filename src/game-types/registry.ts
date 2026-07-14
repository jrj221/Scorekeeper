import { Game } from '@/context/games-context';

import { base } from './base';
import { phase10 } from './phase10';
import { GameTypeDefinition } from './types';

/** Resolves the behavior descriptor for a game, per REFACTOR_PLAN.md §2a. */
export function getGameType(game: Pick<Game, 'gameType'> | undefined | null): GameTypeDefinition {
  if (game?.gameType === 'phase10') return phase10;
  return base;
}

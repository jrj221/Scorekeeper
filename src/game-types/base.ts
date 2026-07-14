import { Player } from '@/context/games-context';
import { getGameTotals } from '@/utils/game-totals';

import { GameTypeDefinition } from './types';

/** Default/"configurable" game type: regular per-round scoring, ranked by total. */
export const base: GameTypeDefinition = {
  sortPlayers(game, players, totals) {
    return [...players].sort((a, b) =>
      game.rankByLowest ? (totals[a.id] ?? 0) - (totals[b.id] ?? 0) : (totals[b.id] ?? 0) - (totals[a.id] ?? 0),
    );
  },

  tierKey(game, playerId, totals) {
    return `${totals[playerId] ?? 0}`;
  },

  getTotals(game) {
    return getGameTotals(game);
  },

  winnerLabel(game) {
    if (!game.finishedAt || game.players.length === 0) return '';
    const totals = this.getTotals(game);
    const sorted = this.sortPlayers(game, game.players, totals);
    const topTier: Player[] = [];
    const topKey = sorted.length ? this.tierKey(game, sorted[0].id, totals) : undefined;
    for (const p of sorted) {
      if (this.tierKey(game, p.id, totals) === topKey) topTier.push(p);
      else break;
    }
    if (topTier.length === 1) return `🏆 ${topTier[0].name}`;
    if (topTier.length === 2) return '🤝 2-way Tie';
    return `🤝 ${topTier.length}-way Tie`;
  },

  isFinalRound(game, roundIndex) {
    return game.totalRounds !== undefined && roundIndex >= game.totalRounds - 1;
  },

  finishButtonLabel: 'Show Final Scores',

  secondaryStat() {
    return null;
  },
};

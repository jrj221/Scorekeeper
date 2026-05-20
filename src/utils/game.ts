import { Game } from '@/context/games-context';

export function getGameTotals(game: Game): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const p of game.players) {
    totals[p.id] = game.rounds.reduce((sum, r) => sum + (r[p.id] ?? 0), 0);
  }
  return totals;
}

export function getGameWinnerLabel(game: Game): string {
  if (!game.finishedAt || game.players.length === 0) return '';
  const totals = getGameTotals(game);
  const scores = game.players.map(p => ({ ...p, total: totals[p.id] ?? 0 }));
  const best = game.rankByLowest
    ? Math.min(...scores.map(s => s.total))
    : Math.max(...scores.map(s => s.total));
  const winners = scores.filter(s => s.total === best);
  if (winners.length === 1) return `🏆 ${winners[0].name}`;
  if (winners.length === 2) return '🤝 2-way Tie';
  return `🤝 ${winners.length}-way Tie`;
}

export function getPlayerWinRate(playerId: string, games: Game[]): string {
  const finished = games.filter(
    g => g.finishedAt && g.players.some(p => p.id === playerId),
  );
  if (finished.length === 0) return '--';
  let wins = 0;
  for (const game of finished) {
    const totals = getGameTotals(game);
    const scores = game.players.map(p => ({ ...p, total: totals[p.id] ?? 0 }));
    const best = game.rankByLowest
      ? Math.min(...scores.map(s => s.total))
      : Math.max(...scores.map(s => s.total));
    if (scores.filter(s => s.total === best).some(s => s.id === playerId)) wins++;
  }
  return `${Math.round((wins / finished.length) * 100)}%`;
}

/** Returns the effective turn order, first player, and dealer for a given round. */
export function getTurnState(game: Game, roundIndex: number): {
  orderedIds: string[];
  firstPlayerId: string | null;
  dealerId: string | null;
} {
  const order = game.turnOrder?.length ? game.turnOrder : game.players.map(p => p.id);
  const n = order.length;
  if (n === 0) return { orderedIds: [], firstPlayerId: null, dealerId: null };

  let baseIndex = 0;
  if (game.firstPlayerId) {
    const idx = order.indexOf(game.firstPlayerId);
    if (idx !== -1) baseIndex = idx;
  }

  const firstIdx = (baseIndex + roundIndex) % n;
  const firstPlayerId = order[firstIdx];
  const orderedIds = [...order.slice(firstIdx), ...order.slice(0, firstIdx)];

  let dealerId: string | null = null;
  if (game.dealerEnabled) {
    switch (game.dealerMode) {
      case 'fixed':
        dealerId = game.fixedDealerId ?? null;
        break;
      case 'random': {
        // Deterministic seed so dealer is stable across re-renders
        const seed = (parseInt(game.id.replace(/\D/g, '').slice(-8) || '0') + roundIndex * 7919);
        dealerId = order[Math.abs(seed) % n];
        break;
      }
      case 'right-of-first':
      default: {
        const dealerIdx = (firstIdx - 1 + n) % n;
        dealerId = order[dealerIdx];
        break;
      }
    }
  }

  return { orderedIds, firstPlayerId, dealerId };
}

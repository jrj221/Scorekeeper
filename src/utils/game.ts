import { DealerMode, Game } from '@/context/games-context';

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

function deterministicIdx(gameId: string, roundIndex: number, n: number): number {
  const seed = parseInt(gameId.replace(/\D/g, '').slice(-8) || '0') + roundIndex * 7919;
  return Math.abs(seed) % n;
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

  // Left-of-dealer: dealer is primary, first player derives from dealer
  if (game.firstPlayerMode === 'left-of-dealer' && game.dealerEnabled) {
    let dealerIdx = 0;
    if (game.dealerMode === 'fixed') {
      const idx = game.fixedDealerId ? order.indexOf(game.fixedDealerId) : -1;
      dealerIdx = idx !== -1 ? idx : 0;
    } else {
      dealerIdx = deterministicIdx(game.id, roundIndex, n);
    }
    const dealerId = order[dealerIdx];
    const firstIdx = (dealerIdx + 1) % n;
    const firstPlayerId = order[firstIdx];
    const orderedIds = [...order.slice(firstIdx), ...order.slice(0, firstIdx)];
    return { orderedIds, firstPlayerId, dealerId };
  }

  // Standard: first player is primary, dealer optionally derives from first player
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
      case 'rotation': {
        const startIdx = game.fixedDealerId ? order.indexOf(game.fixedDealerId) : 0;
        dealerId = order[((startIdx >= 0 ? startIdx : 0) + roundIndex) % n];
        break;
      }
      case 'random':
      default:
        dealerId = order[deterministicIdx(game.id, roundIndex, n)];
        break;
    }
  }

  return { orderedIds, firstPlayerId, dealerId };
}

export function getDealerHintText(
  dealerEnabled: boolean,
  dealerMode: DealerMode,
  fixedDealerName?: string,
): string | null {
  if (!dealerEnabled) return null;
  if (dealerMode === 'random') return 'The dealer will be randomly determined each round.';
  if (dealerMode === 'rotation') {
    return fixedDealerName
      ? `${fixedDealerName} deals first, then it rotates to the next player each round.`
      : 'Dealing rotates through all players each round.';
  }
  // fixed
  return fixedDealerName
    ? `${fixedDealerName} will deal every round.`
    : 'The same player will deal every round.';
}

export function getTurnHintText(
  turnsEnabled: boolean,
  firstPlayerMode: 'left-of-dealer' | 'rotation' | 'random' | undefined,
  firstPlayerName?: string,
): string | null {
  if (!turnsEnabled) return null;
  if (firstPlayerMode === 'left-of-dealer') return 'The player to the left of the dealer goes first each round.';
  if (firstPlayerMode === 'random') return 'The first player will be randomly determined each round.';
  // rotation mode
  if (firstPlayerName) return `${firstPlayerName} goes first in Round 1, then it rotates to the next player each round.`;
  return 'The first player rotates through the group each round.';
}

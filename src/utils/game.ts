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

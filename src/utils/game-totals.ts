import { Game } from '@/context/games-context';

export function getGameTotals(game: Game): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const p of game.players) {
    totals[p.id] = game.rounds.reduce((sum, r) => sum + (r[p.id] ?? 0), 0);
  }
  return totals;
}

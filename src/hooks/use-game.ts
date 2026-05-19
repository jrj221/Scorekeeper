import { useCallback } from 'react';

import { Round, useGamesContext } from '@/context/games-context';

export function useGame(id: string) {
  const { getGame, updateGame } = useGamesContext();
  const game = getGame(id);

  const endGame = useCallback(() => {
    if (!game || game.finishedAt) return;
    updateGame({ ...game, finishedAt: Date.now() });
  }, [game, updateGame]);

  const updateScore = useCallback(
    (roundIndex: number, playerId: string, value: number | null) => {
      if (!game) return;
      const len = Math.max(game.rounds.length, roundIndex + 1);
      const rounds: Round[] = Array.from({ length: len }, (_, i) => ({ ...game.rounds[i] }));
      const round = { ...rounds[roundIndex] };
      if (value === null) {
        delete round[playerId];
      } else {
        round[playerId] = value;
      }
      rounds[roundIndex] = round;
      updateGame({ ...game, rounds });
    },
    [game, updateGame],
  );

  const totals: Record<string, number> = {};
  if (game) {
    for (const player of game.players) {
      totals[player.id] = game.rounds.reduce((sum, r) => sum + (r[player.id] ?? 0), 0);
    }
  }

  const sortedPlayers = game
    ? [...game.players].sort((a, b) =>
        game.rankByLowest ? totals[a.id] - totals[b.id] : totals[b.id] - totals[a.id],
      )
    : [];

  let visibleRoundCount = 0;
  if (game) {
    if (game.totalRounds !== undefined) {
      visibleRoundCount = game.totalRounds;
    } else {
      let lastComplete = -1;
      for (let i = 0; i < game.rounds.length; i++) {
        if (game.players.every(p => game.rounds[i][p.id] !== undefined)) {
          lastComplete = i;
        }
      }
      visibleRoundCount = Math.max(1, lastComplete + 2);
    }
  }

  return {
    game,
    endGame,
    updateScore,
    totals,
    sortedPlayers,
    visibleRoundCount,
  };
}
